import { useMemo } from "react";
import { Box } from "@chakra-ui/react";

import { useTestingEntries } from "~/utils/hooks";
import Filters from "~/components/Filters/Filters";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";

const defaultEvaluationFilterOptions = [
  EvaluationFiltersDefaultFields.Input,
  EvaluationFiltersDefaultFields.OriginalOutput,
];

const EvaluationFilters = () => {
  const entries = useTestingEntries().data;

  const filterOptions = useMemo(
    () => [
      ...defaultEvaluationFilterOptions,
      ...[
        ...(entries?.enabledComparisonModels.map((cm) => `${cm} (output)`) || []),
        ...(entries?.deployedFineTunes?.map((ft) => `${ft.slug} (output)`) || []),
      ],
    ],
    [entries?.enabledComparisonModels, entries?.deployedFineTunes],
  );

  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default EvaluationFilters;
