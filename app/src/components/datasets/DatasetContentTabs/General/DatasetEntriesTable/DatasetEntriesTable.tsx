import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, Table, Tbody } from "@chakra-ui/react";
import { RelabelRequestStatus } from "@prisma/client";

import { useDatasetEntries } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import DatasetEntryDrawer from "./DatasetEntryDrawer/DatasetEntryDrawer";

export default function DatasetEntriesTable() {
  const [expandedDatasetEntryId, setExpandedDatasetEntryId] = useState<string | null>(null);
  const [refetchInterval, setRefetchInterval] = useState(0);
  const datasetEntries = useDatasetEntries(refetchInterval).data?.entries;

  const relabelingVisible = useMemo(
    () =>
      !!datasetEntries?.some(
        (entry) =>
          entry.relabelStatuses?.[0] &&
          entry.relabelStatuses[0].status !== RelabelRequestStatus.COMPLETE,
      ),
    [datasetEntries],
  );

  const countingIncomplete = useMemo(
    () => !!datasetEntries?.some((entry) => entry.inputTokens === null),
    [datasetEntries],
  );

  useEffect(
    () => setRefetchInterval(relabelingVisible || countingIncomplete ? 5000 : 0),
    [relabelingVisible, countingIncomplete, setRefetchInterval],
  );

  const toggleExpanded = useCallback(
    (datasetEntryId: string) => {
      if (datasetEntryId === expandedDatasetEntryId) {
        setExpandedDatasetEntryId(null);
      } else {
        setExpandedDatasetEntryId(datasetEntryId);
      }
    },
    [expandedDatasetEntryId, setExpandedDatasetEntryId],
  );

  return (
    <>
      <Card width="100%" overflowX="auto">
        <Table>
          <TableHeader showRelabelStatusColumn={relabelingVisible} />
          <Tbody>
            {datasetEntries?.length ? (
              datasetEntries?.map((entry) => {
                return (
                  <TableRow
                    key={entry.persistentId}
                    datasetEntry={entry}
                    toggleExpanded={toggleExpanded}
                    showOptions
                    showRelabelStatusColumn={relabelingVisible}
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
        datasetEntryId={expandedDatasetEntryId}
        setDatasetEntryId={setExpandedDatasetEntryId}
      />
    </>
  );
}
