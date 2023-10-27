import { useState, useEffect, useMemo } from "react";
import { VStack, Card, Grid, HStack, Box } from "@chakra-ui/react";

import { useTestingEntries } from "~/utils/hooks";
import EvaluationRow, { TableHeader } from "./EvaluationRow";
import EvaluationPaginator from "./EvaluationPaginator";
import { ORIGINAL_OUTPUT_COLUMN_KEY } from "../ColumnVisibilityDropdown";
import { useVisibleEvaluationColumns } from "../useVisibleEvaluationColumns";
import { COMPARISON_MODEL_NAMES } from "~/utils/baseModels";

const EvaluationTable = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const entries = useTestingEntries(refetchInterval).data;

  useEffect(
    () => setRefetchInterval(entries?.pageIncomplete ? 5000 : 0),
    [entries?.pageIncomplete],
  );

  const { visibleColumns } = useVisibleEvaluationColumns();

  const [showOriginalOutput, visibleModelIds] = useMemo(() => {
    const showOriginalOutput =
      !visibleColumns.length || visibleColumns.includes(ORIGINAL_OUTPUT_COLUMN_KEY);
    const combinedColumnIds: string[] = [];

    if (!entries?.enabledComparisonModels || !entries?.deployedFineTunes)
      return [showOriginalOutput, combinedColumnIds];

    combinedColumnIds.push(
      ...entries.enabledComparisonModels.filter(
        (cm) => !visibleColumns.length || visibleColumns.includes(COMPARISON_MODEL_NAMES[cm]),
      ),
    );
    combinedColumnIds.push(
      ...entries.deployedFineTunes
        .filter((ft) => !visibleColumns.length || visibleColumns.includes(ft.slug))
        .map((ft) => ft.id),
    );
    return [showOriginalOutput, combinedColumnIds];
  }, [entries?.enabledComparisonModels, entries?.deployedFineTunes, visibleColumns]);
  const numOutputColumns = visibleModelIds.length + (showOriginalOutput ? 1 : 0);

  if (!entries) return null;

  return (
    <VStack w="full" h="full" justifyContent="space-between" px={8}>
      <HStack w="full" spacing={0}>
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
            <TableHeader
              showOriginalOutput={showOriginalOutput}
              visibleModelIds={visibleModelIds}
            />
            {entries.entries.map((entry) => (
              <EvaluationRow
                key={entry.id}
                messages={entry.messages}
                output={entry.output}
                fineTuneEntries={entry.fineTuneTestDatasetEntries}
                showOriginalOutput={showOriginalOutput}
                visibleModelIds={visibleModelIds}
              />
            ))}
            {!entries.entries.length && (
              <Box gridColumn="1 / -1" textAlign="center">
                No entries found.
              </Box>
            )}
          </Grid>
        </Card>
        <Box minW={8}>&nbsp;</Box>
      </HStack>
      <EvaluationPaginator py={8} />
    </VStack>
  );
};

export default EvaluationTable;
