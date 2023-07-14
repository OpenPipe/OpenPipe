import { prisma } from "../db";
import { queryLLM } from "../tasks/queryLLM.task";

export const queueLLMRetrievalTask = async (cellId: string) => {
  const updatedCell = await prisma.scenarioVariantCell.update({
    where: {
      id: cellId,
    },
    data: {
      retrievalStatus: "PENDING",
      errorMessage: null,
    },
    include: {
      modelOutput: true,
    },
  });

  // @ts-expect-error we aren't passing the helpers but that's ok
  void queryLLM.task.handler({ scenarioVariantCellId: cellId }, { logger: console });

  return updatedCell;
};
