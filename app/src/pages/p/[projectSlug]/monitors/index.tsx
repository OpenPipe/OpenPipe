import { Text, VStack, HStack } from "@chakra-ui/react";
import ConditionallyEnable from "~/components/ConditionallyEnable";

import MonitorsTable from "~/components/monitors/MonitorsTable";
import NewMonitorButton from "~/components/monitors/NewMonitorButton";
import AppShell from "~/components/nav/AppShell";

export default function Monitors() {
  return (
    <AppShell title="Monitors" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <HStack w="full" justifyContent="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            Monitors
          </Text>
          <ConditionallyEnable accessRequired="requireCanModifyProject">
            <NewMonitorButton />
          </ConditionallyEnable>
        </HStack>

        <MonitorsTable />
      </VStack>
    </AppShell>
  );
}
