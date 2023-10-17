import { useState, useEffect, useMemo } from "react";
import { VStack, Card, Grid, HStack, Box } from "@chakra-ui/react";

import { useTestingEntries } from "~/utils/hooks";
import EvaluationRow, { TableHeader } from "./EvaluationRow";
import EvaluationPaginator from "./EvaluationPaginator";
import { ORIGINAL_OUTPUT_COLUMN_KEY } from "../ColumnVisibilityDropdown";
import { useVisibleEvaluationColumns } from "../useVisibleEvaluationColumns";

const EvaluationTable = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const entries = useTestingEntries(refetchInterval).data;

  useEffect(
    () => setRefetchInterval(entries?.pageIncomplete ? 5000 : 0),
    [entries?.pageIncomplete],
  );

  const { visibleColumns } = useVisibleEvaluationColumns();

  const [showOriginalOutput, visibleFineTuneIds] = useMemo(() => {
    const showOriginalOutput =
      !visibleColumns.length || visibleColumns.includes(ORIGINAL_OUTPUT_COLUMN_KEY);
    const combinedColumnIds: string[] = [];

    if (!entries?.deployedFineTunes) return [showOriginalOutput, combinedColumnIds];

    return [
      showOriginalOutput,
      entries.deployedFineTunes
        .filter((ft) => !visibleColumns.length || visibleColumns.includes(ft.slug))
        .map((ft) => ft.id),
    ];
  }, [entries?.deployedFineTunes, visibleColumns]);
  const numOutputColumns = visibleFineTuneIds.length + (showOriginalOutput ? 1 : 0);

  if (!entries) return null;

  return (
    <VStack w="full" h="full" justifyContent="space-between" pl={8}>
      <HStack w="full" spacing={0}>
        <Card flex={1} minW="fit-content" variant="outline">
          <Grid
            display="grid"
            gridTemplateColumns={
              numOutputColumns ? `550px repeat(${numOutputColumns}, minmax(480px, 1fr))` : `1fr`
            }
            sx={{
              "> *": {
                borderColor: "gray.300",
                padding: 4,
              },
            }}
          >
            <TableHeader
              showOriginalOutput={showOriginalOutput}
              visibleFineTuneIds={visibleFineTuneIds}
            />
            {entries.entries.map((entry) => (
              <EvaluationRow
                key={entry.id}
                messages={entry.messages}
                output={entry.output}
                fineTuneEntries={entry.fineTuneTestDatasetEntries}
                showOriginalOutput={showOriginalOutput}
                visibleFineTuneIds={visibleFineTuneIds}
              />
            ))}
          </Grid>
        </Card>
        <Box minW={8}>&nbsp;</Box>
      </HStack>
      <EvaluationPaginator py={8} />
    </VStack>
  );
};

export default EvaluationTable;
