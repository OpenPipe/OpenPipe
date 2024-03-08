import { Card, Table, Tbody } from "@chakra-ui/react";
import { useState, useMemo, useEffect, useCallback } from "react";

import { api } from "~/utils/api";
import { useDataset, useNodeEntries } from "~/utils/hooks";

import DatasetEntryDrawer from "./DatasetEntryDrawer/DatasetEntryDrawer";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";

export default function DatasetEntriesTable() {
  const [expandedNodeEntryPersistentId, setExpandedNodeEntryPersistentId] = useState<string | null>(
    null,
  );
  const [refetchInterval, setRefetchInterval] = useState(0);
  const nodeEntries = useNodeEntries(refetchInterval).data?.entries;
  const numIncomingEntries = useDataset().data?.numIncomingEntries;

  const countingIncomplete = useMemo(
    () => !!nodeEntries?.some((entry) => entry.inputTokens === null),
    [nodeEntries],
  );

  const awaitingRelabeling = !!numIncomingEntries;

  const utils = api.useUtils();

  useEffect(() => {
    void utils.nodeEntries.list.invalidate();
  }, [awaitingRelabeling]);

  useEffect(
    () => setRefetchInterval(countingIncomplete || awaitingRelabeling ? 5000 : 0),
    [countingIncomplete, awaitingRelabeling, setRefetchInterval],
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
