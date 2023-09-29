import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import defineTask from "../defineTask";
import url from "url";
import dedent from "dedent";
import { $ } from "execa";

export type DeployFineTuneJob = {
  fineTuneId: string;
};

export const deployFineTuneTask = defineTask<DeployFineTuneJob>("deployFineTune", async (task) => {
  await deployFineTune(task.fineTuneId);
});

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
export const trainerDirectory = path.join(dirname, "..", "..", "..", "..", "..", "trainer");

export async function deployFineTune(fineTuneId: string) {
  const fineTune = await prisma.fineTune.findUnique({
    where: { id: fineTuneId },
  });

  if (!fineTune) {
    throw new Error("Trying to deploy a model that does not exist");
  }

  if (!fineTune.huggingFaceModelId) {
    throw new Error("Trying to deploy a model that does not have a Hugging Face model ID");
  }

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "DEPLOYING",
      deploymentStartedAt: new Date(),
    },
  });

  const modalDeployId = `ft-${env.NODE_ENV}-${fineTuneId}`;

  // Inline setupTemporaryEnvironment
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "deploy-"));

  const srcDir = path.join(trainerDirectory, "inference_server");
  const destDir = tempDir;
  const files = await fs.readdir(srcDir);
  const pythonFiles = files.filter((file) => file.endsWith(".py"));

  // Copy python files concurrently
  await Promise.all(
    pythonFiles.map((file) => {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      return fs.copyFile(src, dest);
    }),
  );

  // Write config file
  const configContent = dedent`
      deploy_id = "${modalDeployId}"
      hugging_face_model_id = "${fineTune.huggingFaceModelId}"
      min_gpus = ${fineTune.modalMinGpus.toString()}
      requests_per_instance = ${fineTune.modalRequestsPerInstance.toString()}`;
  const configPath = path.join(tempDir, "config.py");
  await fs.writeFile(configPath, configContent);

  await $({ stdio: "inherit", cwd: trainerDirectory })`poetry run modal deploy ${tempDir}/main.py`;

  await fs.rm(tempDir, { recursive: true, force: true });

  await prisma.fineTune.update({
    where: { id: fineTuneId },
    data: {
      status: "DEPLOYED",
      deploymentFinishedAt: new Date(),
      modalDeployId,
    },
  });
}
