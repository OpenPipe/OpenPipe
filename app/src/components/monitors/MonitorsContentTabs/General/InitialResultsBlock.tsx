import { useState } from "react";
import { HStack, VStack, Collapse, Text, Button, Icon, Skeleton } from "@chakra-ui/react";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";

import LoggedCallsTable from "~/components/requestLogs/LoggedCallsTable";
import { ProjectLink } from "~/components/ProjectLink";
import { constructFiltersQueryParams } from "~/components/Filters/useFilters";
import { useLoggedCallsCount } from "~/utils/hooks";
import ColumnVisibilityDropdown from "~/components/requestLogs/ColumnVisibilityDropdown";
import ActionButton from "~/components/ActionButton";
import { useMonitorFilters } from "./useMonitorFilters";

const InitialResultsBlock = () => {
  const [expanded, setExpanded] = useState(false);

  const { initialFilters, sampleRate, maxOutputSize } = useMonitorFilters();

  const count = useLoggedCallsCount({
    filters: initialFilters,
    sampleRate,
    maxOutputSize,
    skipCacheHits: true,
    disabled: !initialFilters.length,
  }).data?.count;

  const filtersQueryParams = constructFiltersQueryParams({ filters: initialFilters });

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
          <LoggedCallsTable
            filters={initialFilters}
            sampleRate={sampleRate}
            maxOutputSize={maxOutputSize}
            skipCacheHits
            showOptions={false}
            slowBatch
            orderBy="updatedAt"
          />
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default InitialResultsBlock;
