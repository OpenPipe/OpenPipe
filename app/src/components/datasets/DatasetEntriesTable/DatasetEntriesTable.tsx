import { Card, Table, Tbody } from "@chakra-ui/react";
import { useState } from "react";
import { useDatasetEntries } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import DatasetEntryEditorDrawer from "./DatasetEntryEditorDrawer";

export default function DatasetEntriesTable() {
  const [expandedDatasetEntryId, setExpandedDatasetEntryId] = useState<string | null>(null);
  const datasetEntries = useDatasetEntries().data?.entries;

  return (
    <>
      <Card width="100%" overflowX="auto">
        <Table>
          <TableHeader />
          <Tbody>
            {datasetEntries?.length ? (
              datasetEntries?.map((entry) => {
                return (
                  <TableRow
                    key={entry.id}
                    datasetEntry={entry}
                    onToggle={() => {
                      if (entry.id === expandedDatasetEntryId) {
                        setExpandedDatasetEntryId(null);
                      } else {
                        setExpandedDatasetEntryId(entry.id);
                      }
                    }}
                    showOptions
                  />
                );
              })
            ) : (
              <EmptyTableRow />
            )}
          </Tbody>
        </Table>
      </Card>
      <DatasetEntryEditorDrawer
        datasetEntryId={expandedDatasetEntryId}
        clearDatasetEntryId={() => setExpandedDatasetEntryId(null)}
      />
    </>
  );
}
