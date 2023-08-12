import { Text, VStack, Divider, HStack } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import ActionButton from "~/components/requestLogs/ActionButton";
import { useAppStore } from "~/state/store";
import { RiFlaskLine } from "react-icons/ri";

export default function LoggedCalls() {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  return (
    <AppShell title="Request Logs" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          Request Logs
        </Text>
        <Divider />
        <HStack w="full" justifyContent="flex-end">
          <ActionButton
            onClick={() => {
              console.log("experimenting with these ids", selectedLogIds);
            }}
            label="Experiment"
            icon={RiFlaskLine}
            isDisabled={selectedLogIds.size === 0}
          />
        </HStack>
        <LoggedCallTable />
        <LoggedCallsPaginator />
      </VStack>
    </AppShell>
  );
}
