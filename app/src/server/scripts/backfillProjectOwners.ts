import { prisma } from "../db";

const projects = await prisma.project.findMany({});

for (const project of projects) {
  const owner = await prisma.projectUser.findFirst({
    where: {
      projectId: project.id,
      role: "ADMIN",
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  if (owner) {
    await prisma.projectUser.update({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: owner.userId,
        },
      },
      data: {
        role: "OWNER",
      },
    });
  }
}
