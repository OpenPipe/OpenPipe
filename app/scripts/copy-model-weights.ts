// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { $ } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { prisma } from "~/server/db";
import fs from "fs";

delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

const $$ = $({ stdio: "inherit", shell: true });

const argv = await yargs(hideBin(process.argv))
  .option("slug", {
    type: "string",
    description: "The slug of the model to copy the weights from",
    demandOption: true,
  })
  .option("fireworks", {
    type: "boolean",
    description: "Enable fireworks",
    default: false,
  })
  .option("stage", {
    // Adding the stage option
    type: "boolean",
    description: "Enable uploading to stage",
    default: false,
  })
  .option("modal", {
    // Adding the modal option
    type: "boolean",
    description: "Enable uploading to Modal",
    default: false,
  }).argv;

const modelSlug = argv.slug;

const model = await prisma.fineTune.findUniqueOrThrow({
  where: { slug: modelSlug },
});

if (model.pipelineVersion < 3) {
  throw new Error("Only pipeline version 3 models are supported");
}

const localPath = `/tmp/${modelSlug}`;

await $$`mkdir -p ${localPath}`;
await $$`rm -rf ${localPath}`;

const stagePath = `s3://user-models-pl-stage-4c769c7/models/${model.baseModel}:${model.id}:1`;
const prodPath = `s3://user-models-pl-prod-5e7392e/models/${model.baseModel}:${model.id}:1`;

console.log("Downloading the model weights...");
await $$`aws s3 sync ${prodPath} ${localPath}`;

if (argv.stage) {
  console.log("Uploading the model weights to stage...");
  await $$`aws s3 sync ${localPath} ${stagePath}`;
}

if (argv.modal) {
  console.log("Uploading the model weights to Modal...");
  await $$({
    cwd: "../trainer",
  })`poetry run modal volume put --env dev openpipe-model-cache ${localPath} /loras2/${model.id}`;
}

if (argv.fireworks) {
  console.log("Uploading the model weights to Fireworks...");

  fs.writeFileSync(
    `${localPath}/fireworks.json`,
    JSON.stringify({
      base_model: "accounts/fireworks/models/mixtral-8x7b-instruct-hf",
    }),
  );

  await $$`firectl create model ${model.id} --deploy --wait /tmp/${modelSlug}/`;
}
