import { test } from "vitest";
import { prisma } from "~/server/db";
import { deployFineTune } from "./deployFineTune.task";

test.only(
  "should deploy a fine tune",
  async ({}) => {
    const project = await prisma.project.create({
      data: { name: "project-1" },
    });
    const dataset = await prisma.dataset.create({
      data: {
        name: "dataset-1",
        projectId: project.id,
      },
    });

    const ft = await prisma.fineTune.create({
      data: {
        slug: "ft-1",
        projectId: project.id,
        datasetId: dataset.id,
        modalDeployId: "ft-local-test",
        huggingFaceModelId: "OpenPipe/openpipe-848c83ca-df7d-4379-bb37-3b368b35f472-no-st",
        pipelineVersion: 2,
      },
    });

    await deployFineTune(ft.id);
  },
  {
    timeout: 1000 * 60 * 60 * 20,
  },
);
