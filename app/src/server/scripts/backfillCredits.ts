import { prisma } from "../db";

console.log("Backfilling credits for existing projects");

const projects = await prisma.project.findMany();

console.log(`Found projects to backfill: ${projects.length}`);

for (const project of projects) {
  await prisma.creditAdjustment.create({
    data: {
      projectId: project.id,
      amount: 100,
      type: "BONUS",
      description: "100 free credits for new project",
    },
  });
}

console.log("Done!");
