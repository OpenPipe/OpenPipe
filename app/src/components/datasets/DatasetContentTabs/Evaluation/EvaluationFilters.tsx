import { useMemo } from "react";
import { Box } from "@chakra-ui/react";

import { useDataset } from "~/utils/hooks";
import Filters from "~/components/Filters/Filters";
import {
  EVALUATION_FILTERS_OUTPUT_APPENDIX,
  EvaluationFiltersDefaultFields,
} from "~/types/shared.types";
import { COMPARISON_MODEL_NAMES } from "~/utils/comparisonModels";

const EvaluationFilters = () => {
  const dataset = useDataset().data;

  const filterOptions = useMemo(
    () => [
      { field: EvaluationFiltersDefaultFields.Input },
      { field: EvaluationFiltersDefaultFields.DatasetOutput },
      ...[
        ...(dataset?.enabledComparisonModels || []).map((cm) => ({
          field: COMPARISON_MODEL_NAMES[cm] + EVALUATION_FILTERS_OUTPUT_APPENDIX,
        })),
        ...(dataset?.deployedFineTunes || []).map((ft) => ({
          field: ft.slug + EVALUATION_FILTERS_OUTPUT_APPENDIX,
        })),
      ],
      ...(dataset?.datasetEvals.length
        ? [
            {
              field: EvaluationFiltersDefaultFields.EvalApplied,
              type: "select" as const,
              options: dataset?.datasetEvals.map((de) => ({
                value: de.id,
                label: de.name,
              })),
            },
          ]
        : []),
      { field: EvaluationFiltersDefaultFields.ImportId },
    ],
    [dataset?.enabledComparisonModels, dataset?.deployedFineTunes, dataset?.datasetEvals],
  );

  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default EvaluationFilters;
