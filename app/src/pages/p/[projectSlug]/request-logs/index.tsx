import { Text, VStack, HStack, Box, IconButton, Icon, keyframes } from "@chakra-ui/react";
import { BiRefresh } from "react-icons/bi";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import LogFilters from "~/components/requestLogs/LogFilters";
import ColumnVisibilityDropdown from "~/components/requestLogs/ColumnVisibilityDropdown";
import ExportButton from "~/components/requestLogs/ExportButton";
import AddToDatasetButton from "~/components/requestLogs/AddToDatasetButton";
import { api } from "~/utils/api";
import { useLoggedCalls } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export default function LoggedCalls() {
  const filtersShown = useFilters(true).filtersShown;

  const utils = api.useContext();

  const { isFetching, isLoading } = useLoggedCalls(true);

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
              icon={
                <Icon
                  as={BiRefresh}
                  boxSize={8}
                  color="gray.400"
                  animation={isFetching || isLoading ? `${spin} 1s linear infinite` : undefined}
                />
              }
              isDisabled={isFetching || isLoading}
              onClick={() => void utils.loggedCalls.list.invalidate()}
            />
          </HStack>
          <HStack w="full" justifyContent="flex-end">
            <AddToDatasetButton />
            <ExportButton />
            <ColumnVisibilityDropdown />
            <ToggleFiltersButton defaultShown />
          </HStack>
          {filtersShown && <LogFilters />}
          <LoggedCallTable />
          <LoggedCallsPaginator />
        </VStack>
      </Box>
    </AppShell>
  );
}
