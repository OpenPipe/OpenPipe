import { useState } from "react";
import { Text, VStack, Divider, HStack } from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import { FiFilter } from "react-icons/fi";
import { useRouter } from "next/router";

import AppShell from "~/components/nav/AppShell";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";
import ActionButton from "~/components/requestLogs/ActionButton";
import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import LogFilters from "~/components/requestLogs/LogFilters/LogFilters";
import ColumnVisiblityDropdown from "~/components/requestLogs/ColumnVisiblityDropdown";

export default function LoggedCalls() {
  const router = useRouter();
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const clearSelectedLogIds = useAppStore((s) => s.selectedLogs.clearSelectedLogIds);

  const { mutateAsync: createFromLoggedCallsMutation } =
    api.experiments.createFromLoggedCalls.useMutation();

  const [createFromLoggedCalls, creating] = useHandledAsyncCallback(async () => {
    if (!selectedLogIds || !selectedProjectId) return;

    const experimentSlug = await createFromLoggedCallsMutation({
      projectId: selectedProjectId,
      loggedCallIds: Array.from(selectedLogIds),
    });

    if (experimentSlug) {
      clearSelectedLogIds();
      await router.push({ pathname: "/experiments/[experimentSlug]", query: { experimentSlug } });
    }
  }, [createFromLoggedCallsMutation, selectedLogIds, clearSelectedLogIds, selectedProjectId]);

  const [filtersShown, setFiltersShown] = useState(true);

  return (
    <AppShell title="Request Logs" requireAuth>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          Request Logs
        </Text>
        <Divider />
        <HStack w="full" justifyContent="flex-end">
          <ColumnVisiblityDropdown />
          <ActionButton
            onClick={() => {
              setFiltersShown(!filtersShown);
            }}
            label={filtersShown ? "Hide Filters" : "Show Filters"}
            icon={FiFilter}
          />
          <ActionButton
            label="Experiment"
            icon={RiFlaskLine}
            isDisabled={selectedLogIds.size === 0}
            isLoading={creating}
            onClick={createFromLoggedCalls}
          />
        </HStack>
        {filtersShown && <LogFilters />}
        <LoggedCallTable />
        <LoggedCallsPaginator />
      </VStack>
    </AppShell>
  );
}
