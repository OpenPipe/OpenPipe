import {
  defaultEvaluationModel,
  findPredefinedEvaluationModel,
} from "~/utils/externalModels/evaluationModels";

export const getEvaluationModel = async (id: string | undefined) => {
  if (!id) return defaultEvaluationModel;

  let predefinedEvaluationModel = findPredefinedEvaluationModel(id);

  if (predefinedEvaluationModel) return predefinedEvaluationModel;

  // TODO:
  // evaluationModel = await prisma.externalModel.findUnique({ where: { id: evaluationModelId } });
  return defaultEvaluationModel;
};
