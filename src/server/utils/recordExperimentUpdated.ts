import { prisma } from "~/server/db";

export const recordExperimentUpdated = async (experimentId: string) => {
  await prisma.experiment.update({
    where: {
      id: experimentId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
};
