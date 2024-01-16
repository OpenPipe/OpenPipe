import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, Table, Tbody } from "@chakra-ui/react";

import { useDatasetEntries } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import DatasetEntryDrawer from "./DatasetEntryDrawer/DatasetEntryDrawer";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

export default function DatasetEntriesTable() {
  const [expandedDatasetEntryPersistentId, setExpandedDatasetEntryPersistentId] = useState<
    string | null
  >(null);
  const [refetchInterval, setRefetchInterval] = useState(0);
  const datasetEntries = useDatasetEntries(refetchInterval).data?.entries;

  const filters = useFilters().filters;

  const relabelingVisible = useMemo(
    () => filters.some((filter) => filter.field === GeneralFiltersDefaultFields.RelabelBatchId),
    [filters],
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
    (datasetEntryPersistentId: string) => {
      if (datasetEntryPersistentId === expandedDatasetEntryPersistentId) {
        setExpandedDatasetEntryPersistentId(null);
      } else {
        setExpandedDatasetEntryPersistentId(datasetEntryPersistentId);
      }
    },
    [expandedDatasetEntryPersistentId, setExpandedDatasetEntryPersistentId],
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
                    isExpanded={entry.persistentId === expandedDatasetEntryPersistentId}
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
        datasetEntryPersistentId={expandedDatasetEntryPersistentId}
        setDatasetEntryPersistentId={setExpandedDatasetEntryPersistentId}
      />
    </>
  );
}
