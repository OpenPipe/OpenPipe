import { type ComparisonModel } from "@prisma/client";

import { EVALUATION_FILTERS_OUTPUT_APPENDIX } from "~/types/shared.types";
import { useFilters } from "~/components/Filters/useFilters";
import { useDataset } from "~/utils/hooks";
import { getComparisonModel, isComparisonModelName } from "~/utils/comparisonModels";

export const useMappedModelIdFilters = () => {
  const dataset = useDataset().data;

  const filters = useFilters().filters;

  // Map displayed model names to their IDs
  return filters.map((filter) => {
    if (!filter.field.endsWith(EVALUATION_FILTERS_OUTPUT_APPENDIX)) return filter;
    const modelName = filter.field.replace(EVALUATION_FILTERS_OUTPUT_APPENDIX, "");
    let modelId = "";
    if (isComparisonModelName(modelName)) {
      modelId = getComparisonModel(modelName) as ComparisonModel;
    } else {
      modelId = dataset?.deployedFineTunes.find((ft) => ft.slug === modelName)?.id ?? "";
    }
    return { ...filter, field: modelId + EVALUATION_FILTERS_OUTPUT_APPENDIX };
  });
};
