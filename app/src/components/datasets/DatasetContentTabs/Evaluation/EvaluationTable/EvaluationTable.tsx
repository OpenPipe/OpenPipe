import { useState, useEffect, useMemo } from "react";
import { Card, Grid, HStack, Box, Text } from "@chakra-ui/react";

import { useDataset, useTestingEntries } from "~/utils/hooks";
import EvaluationRow, { TableHeader } from "./EvaluationRow";
import { ORIGINAL_OUTPUT_COLUMN_KEY } from "../ColumnVisibilityDropdown";
import { useVisibleOutputColumns } from "../useVisibleOutputColumns";
import { COMPARISON_MODEL_NAMES } from "~/utils/baseModels";

const EvaluationTable = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const dataset = useDataset().data;
  const entries = useTestingEntries(refetchInterval).data;

  useEffect(
    () => setRefetchInterval(entries?.pageIncomplete ? 5000 : 0),
    [entries?.pageIncomplete],
  );

  const { visibleColumns } = useVisibleOutputColumns();

  const [showOriginalOutput, visibleModelIds] = useMemo(() => {
    const showOriginalOutput =
      !visibleColumns.length || visibleColumns.includes(ORIGINAL_OUTPUT_COLUMN_KEY);
    const combinedColumnIds: string[] = [];

    if (!dataset?.enabledComparisonModels || !dataset?.deployedFineTunes)
      return [showOriginalOutput, combinedColumnIds];

    combinedColumnIds.push(
      ...dataset.enabledComparisonModels.filter(
        (cm) => !visibleColumns.length || visibleColumns.includes(COMPARISON_MODEL_NAMES[cm]),
      ),
    );
    combinedColumnIds.push(
      ...dataset.deployedFineTunes
        .filter((ft) => !visibleColumns.length || visibleColumns.includes(ft.slug))
        .map((ft) => ft.id),
    );
    return [showOriginalOutput, combinedColumnIds];
  }, [dataset?.enabledComparisonModels, dataset?.deployedFineTunes, visibleColumns]);
  const numOutputColumns = visibleModelIds.length + (showOriginalOutput ? 1 : 0);

  if (!entries) return null;

  return (
    <HStack w="full" px={8} spacing={0}>
      <Card flex={1} minW="fit-content" variant="outline">
        <Grid
          display="grid"
          gridTemplateColumns={`minmax(600px, 1fr) repeat(${numOutputColumns}, 480px)`}
          sx={{
            "> *": {
              borderColor: "gray.300",
              padding: 4,
            },
          }}
        >
          <TableHeader showOriginalOutput={showOriginalOutput} visibleModelIds={visibleModelIds} />
          {entries.entries.map((entry) => (
            <EvaluationRow
              key={entry.id}
              entry={entry}
              showOriginalOutput={showOriginalOutput}
              visibleModelIds={visibleModelIds}
            />
          ))}
          {!entries.entries.length && (
            <Box gridColumn="1 / -1" textAlign="center" py={6}>
              <Text color="gray.500">No matching entries found. Try removing some filters.</Text>
            </Box>
          )}
        </Grid>
      </Card>
      <Box minW={8}>&nbsp;</Box>
    </HStack>
  );
};

export default EvaluationTable;
