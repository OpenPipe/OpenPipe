import { Card, Table, Tbody } from "@chakra-ui/react";
import { useState } from "react";
import { useDatasetEntries } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";

export default function DatasetEntriesTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const datasetEntries = useDatasetEntries().data?.entries;

  return (
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
                  isExpanded={entry.id === expandedRow}
                  onToggle={() => {
                    if (entry.id === expandedRow) {
                      setExpandedRow(null);
                    } else {
                      setExpandedRow(entry.id);
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
  );
}
