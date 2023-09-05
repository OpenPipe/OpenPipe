import { useState } from "react";
import { Text, VStack, Divider, HStack, Box } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import ActionButton from "~/components/ActionButton";
import { useAppStore } from "~/state/store";
import { FiFilter } from "react-icons/fi";
import LogFilters from "~/components/requestLogs/LogFilters/LogFilters";
import ColumnVisiblityDropdown from "~/components/requestLogs/ColumnVisiblityDropdown";
import ExportButton from "~/components/requestLogs/ExportButton";
import AddToDatasetButton from "~/components/requestLogs/AddToDatasetButton";

export default function LoggedCalls() {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);

  const [filtersShown, setFiltersShown] = useState(true);

  return (
    <AppShell title="Request Logs" requireAuth>
      <Box h="100vh" overflowY="scroll">
        <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
          <Text fontSize="2xl" fontWeight="bold">
            Request Logs
          </Text>
          <Divider />
          <HStack w="full" justifyContent="flex-end">
            <AddToDatasetButton />
            <ExportButton />
            <ColumnVisiblityDropdown />
            <ActionButton
              onClick={() => {
                setFiltersShown(!filtersShown);
              }}
              label={filtersShown ? "Hide Filters" : "Show Filters"}
              icon={FiFilter}
            />
          </HStack>
          {filtersShown && <LogFilters />}
          <LoggedCallTable />
          <LoggedCallsPaginator />
        </VStack>
      </Box>
    </AppShell>
  );
}
