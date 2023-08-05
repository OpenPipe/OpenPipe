import { prisma } from "~/server/db";

export const recordExperimentUpdated = (experimentId: string) => {
  return prisma.experiment.update({
    where: {
      id: experimentId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
};
