import { type ComparisonModel } from "@prisma/client";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { getComparisonModelSlug, isComparisonModel } from "~/utils/comparisonModels";
import { formatFTSlug } from "~/utils/utils";

export const getOutputTitle = (modelId: string | null, slug?: string | null) => {
  let title = null;
  if (modelId === ORIGINAL_MODEL_ID) {
    title = "Dataset Output";
  } else if (modelId && isComparisonModel(modelId)) {
    title = getComparisonModelSlug(modelId as ComparisonModel);
  } else if (slug) {
    title = formatFTSlug(slug);
  }
  return title;
};
