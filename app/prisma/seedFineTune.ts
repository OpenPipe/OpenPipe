import { prisma } from "~/server/db";

const project = await prisma.project.findFirst({
  where: {
    personalProjectUserId: {
      not: null,
    },
  },
  orderBy: {
    createdAt: "asc",
  },
});

if (!project) {
  console.error("No project found. Sign up to create your first project.");
  process.exit(1);
}

const fineTuneId = "11111111-1111-1111-1111-111111111111";

const existingFineTune = await prisma.fineTune.findUnique({
  where: { id: fineTuneId },
});

if (existingFineTune) {
  await prisma.fineTune.delete({
    where: { id: fineTuneId },
  });
  await prisma.dataset.delete({
    where: { id: existingFineTune.datasetId },
  });
}

const dataset = await prisma.dataset.create({
  data: {
    name: "test-dataset",
    project: {
      connect: {
        id: project.id,
      },
    },
  },
});

await prisma.datasetEntry.create({
  data: {
    datasetId: dataset.id,
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "What is the capitol of Tasmania?" },
    ],
    inputTokens: 10,
    output: { role: "assistant", content: "Hobart" },
    outputTokens: 1,
    type: "TRAIN",
    sortKey: "1",
    importId: "test-import-id",
    provenance: "UPLOAD",
  },
});
await prisma.datasetEntry.create({
  data: {
    datasetId: dataset.id,
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "What is the capitol of Latvia?" },
    ],
    inputTokens: 10,
    output: { role: "assistant", content: "Riga" },
    outputTokens: 1,
    type: "TRAIN",
    sortKey: "1",
    importId: "test-import-id",
    provenance: "UPLOAD",
  },
});

await prisma.fineTune.create({
  data: {
    id: fineTuneId,
    slug: process.env.FINE_TUNE_SLUG || "test-fine-tune",
    baseModel: "LLAMA2_7b",
    status: "PENDING",
    projectId: project.id,
    datasetId: dataset.id,
    inferenceUrls: process.env.FINE_TUNE_INFERENCE_URL ? [process.env.FINE_TUNE_INFERENCE_URL] : [],
    pipelineVersion: 1,
  },
});
