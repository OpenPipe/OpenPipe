import { prisma } from "~/server/db";

const fineTunedModels = await prisma.fineTune.findMany({
  where: {
    status: "DEPLOYED",
  },
});

if (!fineTunedModels) {
  console.error("No models found. Fine tune a model to create a usage log.");
  process.exit(1);
}

//Create usage log for each model
fineTunedModels.forEach(async (model) => {
  for (let i = 0; i < 5000; i++) {
    const type = getRandomType();
    await prisma.usageLog.create({
      data: {
        fineTuneId: model.id,
        projectId: model.projectId,
        type: getRandomType(),
        inputTokens: Math.floor(Math.random() * 1000) + 1,
        outputTokens: Math.floor(Math.random() * 1000) + 1,
        cost: type === "CACHE_HIT" ? 0 : Math.random() * (0.05 - 0.0000492) + 0.0000492,
        billable: type === "CACHE_HIT" ? false : true,
        // Random date in the last year
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 31536000000)),
      },
    });
  }
});

enum Type {
  TRAINING = "TRAINING",
  TESTING = "TESTING",
  EXTERNAL = "EXTERNAL",
  CACHE_HIT = "CACHE_HIT",
}

function getRandomType(): Type {
  // Array with 'EXTERNAL' type having a higher frequency
  const types: Type[] = [
    Type.EXTERNAL,
    Type.EXTERNAL,
    Type.EXTERNAL,
    Type.EXTERNAL,
    Type.TRAINING,
    Type.TESTING,
    Type.CACHE_HIT,
  ];

  // Randomly select an index
  const randomIndex = Math.floor(Math.random() * types.length);

  return types[randomIndex]!;
}
