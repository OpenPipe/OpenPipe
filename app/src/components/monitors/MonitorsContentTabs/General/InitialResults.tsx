import { useState } from "react";
import { HStack, VStack, Collapse, Text, Button, Icon, Skeleton } from "@chakra-ui/react";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";

import { INITIAL_FILTERS_URL_KEY } from "./InitialFilters";
import LoggedCallsTable from "~/components/requestLogs/LoggedCallsTable";
import { ProjectLink } from "~/components/ProjectLink";
import { constructFiltersQueryParams, useFilters } from "~/components/Filters/useFilters";
import { useLoggedCallsCount } from "~/utils/hooks";
import ColumnVisibilityDropdown from "~/components/requestLogs/ColumnVisibilityDropdown";
import ActionButton from "~/components/ActionButton";

const InitialResults = () => {
  const [expanded, setExpanded] = useState(false);

  const initialFilters = useFilters({ urlKey: INITIAL_FILTERS_URL_KEY }).filters;

  const count = useLoggedCallsCount({ filters: initialFilters }).data?.count;

  const filtersQueryParams = constructFiltersQueryParams({ filters: initialFilters });

  return (
    <VStack w="full" spacing={0}>
      <HStack
        as={Button}
        variant="ghost"
        w={64}
        onClick={() => setExpanded(!expanded)}
        mt={8}
        mb={4}
      >
        <Text>{expanded ? "Hide" : "Preview"} Initial Results</Text>
        <Skeleton isLoaded={count !== undefined}>
          <Text>({count ? count.toLocaleString() : 0})</Text>
        </Skeleton>
        <Icon as={expanded ? FaChevronUp : FaChevronDown} />
      </HStack>

      <Collapse in={expanded} style={{ width: "100%" }}>
        <VStack w="full" pb={8}>
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
              <ActionButton
                icon={FaExternalLinkAlt}
                iconBoxSize={3.5}
                label={`View All (${count ? count.toLocaleString() : 0})`}
              />
            </ProjectLink>
          </HStack>
          <LoggedCallsTable filters={initialFilters} showOptions={false} />
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default InitialResults;
