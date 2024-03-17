import { useMemo, useState } from "react";
import { VStack, HStack, ButtonGroup, Button, Text } from "@chakra-ui/react";

import { useMonitor } from "../../useMonitor";
import FilteredNodeEntriesTable, { addFilterOutcomeFilter } from "./FilteredNodeEntriesTable";
import { FilterOutput } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import { useFilters } from "~/components/Filters/useFilters";
import { useNodeEntries } from "~/utils/hooks";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";
import BasicNodeEntryFilters from "~/components/nodeEntries/BasicNodeEntryFilters";
import Paginator from "~/components/Paginator";

const Results = () => {
  const monitor = useMonitor().data;
  const filtersShown = useFilters().filtersShown;
  const filters = useFilters().filters;

  const [selectedOutput, setSelectedOutput] = useState<FilterOutput | undefined>(
    FilterOutput.Passed,
  );

  const combinedFilters = useMemo(
    () => addFilterOutcomeFilter({ filters: filters, filterOutcome: selectedOutput }),

    [filters, selectedOutput],
  );

  const matchingCount = useNodeEntries({ nodeId: monitor?.filter.id, filters: combinedFilters })
    .data?.matchingCount;

  return (
    <VStack w="full" pb={16} alignItems="flex-start">
      <HStack w="full" justifyContent="space-between" pb={4}>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            bgColor="white"
            isActive={selectedOutput === FilterOutput.Passed}
            onClick={() => setSelectedOutput(FilterOutput.Passed)}
          >
            Passed
          </Button>
          <Button
            bgColor="white"
            isActive={selectedOutput === FilterOutput.Failed}
            onClick={() => setSelectedOutput(FilterOutput.Failed)}
          >
            Failed
          </Button>
          <Button
            bgColor="white"
            isActive={!selectedOutput}
            onClick={() => setSelectedOutput(undefined)}
          >
            All
          </Button>
        </ButtonGroup>
        <ToggleFiltersButton />
      </HStack>
      {filtersShown && <BasicNodeEntryFilters pb={8} />}
      <Text fontWeight="bold" fontSize="lg">
        Matching Entries {matchingCount !== undefined ? `(${matchingCount.toLocaleString()})` : ""}
      </Text>
      <FilteredNodeEntriesTable filters={combinedFilters} />
      {matchingCount && <Paginator count={matchingCount} />}
    </VStack>
  );
};

export default Results;
