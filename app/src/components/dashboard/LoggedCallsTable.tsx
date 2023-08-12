import { Card, CardHeader, Heading, Table, Tbody, HStack, Button, Text } from "@chakra-ui/react";
import { useState } from "react";
import Link from "next/link";
import { useLoggedCalls } from "~/utils/hooks";
import { TableHeader, TableRow } from "../requestLogs/TableRow";

export default function LoggedCallsTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: loggedCalls } = useLoggedCalls();

  return (
    <Card variant="outline" width="100%" overflow="hidden">
      <CardHeader>
        <HStack justifyContent="space-between">
          <Heading as="h3" size="sm">
            Logged Calls
          </Heading>
          <Button as={Link} href="/request-logs" variant="ghost" colorScheme="blue">
            <Text>View All</Text>
          </Button>
        </HStack>
      </CardHeader>
      <Table>
        <TableHeader />
        <Tbody>
          {loggedCalls?.calls.map((loggedCall) => {
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
          })}
        </Tbody>
      </Table>
    </Card>
  );
}
