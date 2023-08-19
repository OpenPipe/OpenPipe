import { useState } from "react";
import { Text, VStack, Divider, HStack } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import ActionButton from "~/components/requestLogs/ActionButton";
import { useAppStore } from "~/state/store";
import { RiFlaskLine } from "react-icons/ri";
import { FiFilter } from "react-icons/fi";
import { BsToggles } from "react-icons/bs";
import LogFilters from "~/components/requestLogs/LogFilters/LogFilters";
import { useTagNames } from "~/utils/hooks";
import { StaticColumnKeys } from "~/state/columnVisiblitySlice";

export default function LoggedCalls() {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const hiddenColumns = useAppStore((s) => s.columnVisibility.hiddenColumns);
  const tagNames = useTagNames().data;

  const totalColumns = Object.keys(StaticColumnKeys).length + (tagNames?.length ?? 0);

  const [filtersShown, setFiltersShown] = useState(true);

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
            label={`Show (${totalColumns - hiddenColumns.size}/${totalColumns})`}
            icon={BsToggles}
          />
          <ActionButton
            onClick={() => {
              setFiltersShown(!filtersShown);
            }}
            label={filtersShown ? "Hide Filters" : "Show Filters"}
            icon={FiFilter}
          />
          <ActionButton
            onClick={() => {
              console.log("experimenting with these ids", selectedLogIds);
            }}
            label="Experiment"
            icon={RiFlaskLine}
            isDisabled={selectedLogIds.size === 0}
          />
        </HStack>
        {filtersShown && <LogFilters />}
        <LoggedCallTable />
        <LoggedCallsPaginator />
      </VStack>
    </AppShell>
  );
}
