import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, Table, Tbody } from "@chakra-ui/react";

import { useNodeEntries } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import DatasetEntryDrawer from "./DatasetEntryDrawer/DatasetEntryDrawer";

export default function DatasetEntryTable() {
  const [expandedNodeEntryPersistentId, setExpandedNodeEntryPersistentId] = useState<string | null>(
    null,
  );
  const [refetchInterval, setRefetchInterval] = useState(0);
  const nodeEntries = useNodeEntries(refetchInterval).data?.entries;

  const countingIncomplete = useMemo(
    () => !!nodeEntries?.some((entry) => entry.inputTokens === null),
    [nodeEntries],
  );

  useEffect(
    () => setRefetchInterval(countingIncomplete ? 5000 : 0),
    [countingIncomplete, setRefetchInterval],
  );

  const toggleExpanded = useCallback(
    (datasetEntryPersistentId: string) => {
      if (datasetEntryPersistentId === expandedNodeEntryPersistentId) {
        setExpandedNodeEntryPersistentId(null);
      } else {
        setExpandedNodeEntryPersistentId(datasetEntryPersistentId);
      }
    },
    [expandedNodeEntryPersistentId, setExpandedNodeEntryPersistentId],
  );

  return (
    <>
      <Card width="100%" overflowX="auto">
        <Table>
          <TableHeader />
          <Tbody>
            {nodeEntries?.length ? (
              nodeEntries?.map((entry) => {
                return (
                  <TableRow
                    key={entry.persistentId}
                    datasetEntry={entry}
                    isExpanded={entry.persistentId === expandedNodeEntryPersistentId}
                    toggleExpanded={toggleExpanded}
                  />
                );
              })
            ) : (
              <EmptyTableRow />
            )}
          </Tbody>
        </Table>
      </Card>
      <DatasetEntryDrawer
        nodeEntryPersistentId={expandedNodeEntryPersistentId}
        setNodeEntryPersistentId={setExpandedNodeEntryPersistentId}
      />
    </>
  );
}
