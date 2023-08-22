import { Card, Table, Tbody } from "@chakra-ui/react";
import { useState } from "react";
import { useLoggedCalls } from "~/utils/hooks";
import { TableHeader, TableRow } from "./TableRow";

export default function LoggedCallsTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const loggedCalls = useLoggedCalls().data;

  return (
    <Card width="100%" overflowX="auto">
      <Table>
        <TableHeader isSimple />
        <Tbody>
          {loggedCalls?.calls?.map((loggedCall) => {
            return (
              <TableRow
                key={loggedCall.id}
                loggedCall={loggedCall}
                isExpanded={loggedCall.id === expandedRow}
                onToggle={() => {
                  if (loggedCall.id === expandedRow) {
                    setExpandedRow(null);
                  } else {
                    setExpandedRow(loggedCall.id);
                  }
                }}
                isSimple
              />
            );
          })}
        </Tbody>
      </Table>
    </Card>
  );
}
