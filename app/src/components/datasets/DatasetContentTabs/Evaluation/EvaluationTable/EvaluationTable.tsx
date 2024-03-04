import { useState, useEffect } from "react";
import { Card, Grid, HStack, Box, Text } from "@chakra-ui/react";

import { useTestingEntries, useDataset } from "~/utils/hooks";
import EvaluationRow, { TableHeader } from "./EvaluationRow";
import { useVisibleModelIds } from "../useVisibleModelIds";
import { api } from "~/utils/api";

const EvaluationTable = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const entries = useTestingEntries(refetchInterval).data;
  const dataset = useDataset().data;

  const dataIncomplete = entries?.pageIncomplete || dataset?.numIncomingEntries;

  const utils = api.useUtils();

  useEffect(() => {
    setRefetchInterval(dataIncomplete ? 5000 : 0);
    if (!dataIncomplete) {
      void utils.nodeEntries.listTestingEntries.invalidate().catch(console.error);
    }
  }, [dataIncomplete, setRefetchInterval]);

  const { visibleModelIds } = useVisibleModelIds();

  if (!entries) return null;

  return (
    <HStack w="full" px={8} spacing={0}>
      <Card flex={1} minW="fit-content" variant="outline">
        <Grid
          display="grid"
          gridTemplateColumns={`minmax(500px, 1fr) repeat(${visibleModelIds.length}, 400px)`}
          sx={{
            "> *": {
              borderColor: "gray.300",
              padding: 4,
            },
          }}
          fontSize="sm"
        >
          <TableHeader />
          {entries.entries.map((entry) => (
            <EvaluationRow key={entry.id} entry={entry} />
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
