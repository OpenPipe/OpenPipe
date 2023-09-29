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
  console.log("FineTune already exists");
  process.exit(0);
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
    input: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "What is the capitol of Tasmania?" },
    ],
    inputTokens: 10,
    output: { role: "assistant", content: "Hobart" },
    outputTokens: 1,
    type: "TEST",
    sortKey: "1",
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
  },
});
