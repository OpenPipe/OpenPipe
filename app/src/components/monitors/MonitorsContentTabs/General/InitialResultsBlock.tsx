import { HStack, VStack, Collapse, Text, Button, Icon, Skeleton } from "@chakra-ui/react";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";

import LoggedCallsTable from "~/components/requestLogs/LoggedCallsTable";
import { ProjectLink } from "~/components/ProjectLink";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { useLoggedCallsCount } from "~/utils/hooks";
import ColumnVisibilityDropdown from "~/components/requestLogs/ColumnVisibilityDropdown";
import ActionButton from "~/components/ActionButton";
import { useInitialFilters } from "./InitialFiltersBlock/useInitialFilters";
import { useAppStore } from "~/state/store";

const InitialResultsBlock = () => {
  const expanded = useAppStore((state) => state.initialResultsExpanded);
  const setExpanded = useAppStore((state) => state.setInitialResultsExpanded);

  const { filters, saveableFilters } = useInitialFilters();

  const count = useLoggedCallsCount({ filters, disabled: !filters.length }).data?.count;

  const filtersQueryParams = constructFiltersQueryParams({ filters: saveableFilters });

  return (
    <VStack w="full" spacing={0}>
      <HStack as={Button} variant="ghost" w={80} onClick={() => setExpanded(!expanded)}>
        <Text>{expanded ? "Hide" : "Preview"} Matching Logs</Text>
        <Skeleton isLoaded={count !== undefined}>
          <Text>({count ? count.toLocaleString() : 0})</Text>
        </Skeleton>
        <Icon as={expanded ? FaChevronUp : FaChevronDown} />
      </HStack>

      <Collapse in={expanded} style={{ width: "100%" }}>
        <VStack w="full" pt={4} pb={8}>
          <HStack w="full" justifyContent="flex-end">
            <ColumnVisibilityDropdown />
            <ProjectLink
              href={{
                pathname: "/request-logs",
                query: {
                  ...filtersQueryParams,
                },
              }}
              target="_blank"
            >
              <ActionButton icon={FaExternalLinkAlt} iconBoxSize={3.5} label="View All" />
            </ProjectLink>
          </HStack>
          <LoggedCallsTable filters={filters} showOptions={false} slowBatch orderBy="updatedAt" />
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default InitialResultsBlock;
