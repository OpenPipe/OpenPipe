import { useMemo } from "react";
import { Box } from "@chakra-ui/react";

import { useDataset } from "~/utils/hooks";
import Filters from "~/components/Filters/Filters";
import {
  EVALUATION_FILTERS_OUTPUT_APPENDIX,
  EvaluationFiltersDefaultFields,
} from "~/types/shared.types";
import { COMPARISON_MODEL_NAMES } from "~/utils/baseModels";

const defaultEvaluationFilterOptions = [
  EvaluationFiltersDefaultFields.Input,
  EvaluationFiltersDefaultFields.OriginalOutput,
];

const EvaluationFilters = () => {
  const dataset = useDataset().data;

  const filterOptions = useMemo(
    () => [
      ...defaultEvaluationFilterOptions,
      ...[
        ...(dataset?.enabledComparisonModels.map(
          (cm) => COMPARISON_MODEL_NAMES[cm] + EVALUATION_FILTERS_OUTPUT_APPENDIX,
        ) || []),
        ...(dataset?.deployedFineTunes?.map((ft) => ft.slug + EVALUATION_FILTERS_OUTPUT_APPENDIX) ||
          []),
      ],
    ],
    [dataset?.enabledComparisonModels, dataset?.deployedFineTunes],
  );

  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default EvaluationFilters;
