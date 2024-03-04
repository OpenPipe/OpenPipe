import { useMemo } from "react";
import { Box } from "@chakra-ui/react";

import { useDataset, useDatasetArchives } from "~/utils/hooks";
import Filters from "~/components/Filters/Filters";
import {
  EVALUATION_FILTERS_OUTPUT_APPENDIX,
  EvaluationFiltersDefaultFields,
} from "~/types/shared.types";
import { getComparisonModelName } from "~/utils/comparisonModels";
import type {
  TextFilterOption,
  FilterOption,
  SelectFilterOption,
} from "~/components/Filters/types";

const EvaluationFilters = () => {
  const dataset = useDataset().data;
  const archives = useDatasetArchives().data;

  const filterOptions = useMemo(() => {
    const initialStaticOptions: FilterOption[] = [
      { type: "text", field: EvaluationFiltersDefaultFields.Input },
      { type: "text", field: EvaluationFiltersDefaultFields.DatasetOutput },
    ];
    const comparisonModelOutputOptions: TextFilterOption[] = (
      dataset?.enabledComparisonModels || []
    ).map((cm) => ({
      type: "text" as const,
      field: getComparisonModelName(cm) ?? "" + EVALUATION_FILTERS_OUTPUT_APPENDIX,
    }));
    const fineTuneOutputOptions: TextFilterOption[] = (dataset?.deployedFineTunes || []).map(
      (ft) => ({
        type: "text" as const,
        field: ft.slug + EVALUATION_FILTERS_OUTPUT_APPENDIX,
      }),
    );
    const datasetEvalOptions: SelectFilterOption[] = dataset?.datasetEvals?.length
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
      : [];
    const finalStaticOptions: FilterOption[] = [];
    if (archives?.length) {
      finalStaticOptions.push({
        type: "select",
        field: EvaluationFiltersDefaultFields.Source,
        options: archives.map((archive) => ({
          value: archive.id,
          label: archive.name,
        })),
      });
    }

    return [
      ...initialStaticOptions,
      ...comparisonModelOutputOptions,
      ...fineTuneOutputOptions,
      ...datasetEvalOptions,
      ...finalStaticOptions,
    ];
  }, [
    dataset?.enabledComparisonModels,
    dataset?.deployedFineTunes,
    dataset?.datasetEvals,
    archives,
  ]);

  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default EvaluationFilters;
