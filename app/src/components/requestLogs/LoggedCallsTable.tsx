import { Card, Table, Tbody } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useLoggedCalls } from "~/utils/hooks";
import { TableHeader, TableRow } from "./TableRow";

export default function LoggedCallsTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data, isLoading } = useLoggedCalls();

  const [loggedCalls, setLoggedCalls] = useState(data);

  useEffect(() => {
    // persist data while loading
    if (!isLoading) {
      setLoggedCalls(data);
    }
  }, [data, isLoading]);

  return (
    <Card width="100%" overflow="hidden">
      <Table>
        <TableHeader showCheckbox />
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
                showCheckbox
              />
            );
          })}
        </Tbody>
      </Table>
    </Card>
  );
}
