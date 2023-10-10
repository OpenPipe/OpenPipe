import { useState } from "react";
import { Text, VStack, HStack, Box, IconButton, Icon } from "@chakra-ui/react";
import { BiRefresh } from "react-icons/bi";
import { FiFilter } from "react-icons/fi";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import ActionButton from "~/components/ActionButton";
import LogFilters from "~/components/requestLogs/LogFilters/LogFilters";
import ColumnVisiblityDropdown from "~/components/requestLogs/ColumnVisiblityDropdown";
import ExportButton from "~/components/requestLogs/ExportButton";
import AddToDatasetButton from "~/components/requestLogs/AddToDatasetButton";
import { api } from "~/utils/api";

export default function LoggedCalls() {
  const [filtersShown, setFiltersShown] = useState(true);

  const utils = api.useContext();

  return (
    <AppShell title="Request Logs" requireAuth>
      <Box h="100vh" overflowY="scroll">
        <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
          <HStack>
            <Text fontSize="2xl" fontWeight="bold">
              Request Logs
            </Text>
            <IconButton
              aria-label="Refresh logs"
              variant="ghost"
              icon={<Icon as={BiRefresh} boxSize={8} color="gray.400" />}
              onClick={() => void utils.loggedCalls.list.invalidate()}
            />
          </HStack>
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
