import { prisma } from "../db";

const projectId = process.argv[2];

console.log("Doing: delete the invoice, switch to not billable");

const project = await prisma.project.findFirstOrThrow({
  where: {
    id: projectId,
  },
});

console.log(`Project: ${project.name}`);
await prisma.invoice.deleteMany({
  where: {
    projectId: project.id,
  },
});
await prisma.creditAdjustment.deleteMany({
  where: {
    projectId: project.id,
  },
});
await prisma.project.update({
  where: {
    id: project.id,
  },
  data: {
    billable: false,
  },
});

console.log("Done!");
