import { Text, VStack } from "@chakra-ui/react";

import EvalsTable from "~/components/evals/EvalsTable";
import AppShell from "~/components/nav/AppShell";

export default function Evals() {
  return (
    <AppShell title="Evals" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          Evals
        </Text>
        <EvalsTable />
      </VStack>
    </AppShell>
  );
}
