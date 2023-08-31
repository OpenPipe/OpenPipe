import { Card, CardHeader, Heading, Table, Tbody, HStack, Button, Text } from "@chakra-ui/react";
import { useState } from "react";
import Link from "next/link";
import { useLoggedCalls } from "~/utils/hooks";
import { EmptyTableRow, TableHeader, TableRow } from "../requestLogs/TableRow";

export default function LoggedCallsTable() {
  const { data: loggedCalls } = useLoggedCalls(false);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <Card width="100%" overflow="hidden">
      <CardHeader>
        <HStack justifyContent="space-between">
          <Heading as="h3" size="sm">
            Request Logs
          </Heading>
          <Button as={Link} href="/request-logs" variant="ghost" colorScheme="blue">
            <Text>View All</Text>
          </Button>
        </HStack>
      </CardHeader>
      <Table>
        <TableHeader />
        <Tbody>
          {loggedCalls?.calls.length ? (
            loggedCalls?.calls.map((loggedCall) => {
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
                />
              );
            })
          ) : (
            <EmptyTableRow filtersApplied={false} />
          )}
        </Tbody>
      </Table>
    </Card>
  );
}
