import { Card, Skeleton, Table, Tbody } from "@chakra-ui/react";
import { useState } from "react";
import { useLoggedCalls } from "~/utils/hooks";
import { TableHeader, TableRow, EmptyTableRow } from "./TableRow";
import { type FilterData } from "../Filters/types";

export default function LoggedCallsTable({
  showOptions = true,
  filters,
}: {
  showOptions?: boolean;
  filters?: FilterData[];
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: loggedCalls, isLoading } = useLoggedCalls({ filters });

  return (
    <Card width="100%" overflowX="auto">
      <Skeleton startColor="gray.100" minHeight="126px" endColor="gray.300" isLoaded={!isLoading}>
        <Table>
          <TableHeader showOptions={showOptions} />
          <Tbody>
            {loggedCalls?.calls.length ? (
              loggedCalls?.calls?.map((loggedCall) => {
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
                    showOptions={showOptions}
                  />
                );
              })
            ) : (
              <EmptyTableRow />
            )}
          </Tbody>
        </Table>
      </Skeleton>
    </Card>
  );
}
