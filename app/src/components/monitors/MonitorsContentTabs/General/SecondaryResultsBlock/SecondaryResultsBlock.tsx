import { useState } from "react";
import { HStack, VStack, Collapse, Text, Button, Icon, Skeleton, Box } from "@chakra-ui/react";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";

import FilteredNodeEntriesTable, {
  addFilterOutcomeFilter,
} from "../../Results/FilteredNodeEntriesTable";
import { FilterOutputSelector } from "../../Results/FilterOutputSelector";
import { useMonitor } from "~/components/monitors/useMonitor";
import { useMonitorFilters } from "../useMonitorFilters";
import { LabelText } from "../styledText";
import { type FilterOutput } from "~/server/utils/nodes/nodeProperties/nodeProperties.types";
import ActionButton from "~/components/ActionButton";
import { MONITOR_RESULTS_KEY } from "../../MonitorsContentTabs";
import { ProjectLink } from "~/components/ProjectLink";

const SecondaryResultsBlock = () => {
  const [expanded, setExpanded] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<FilterOutput | undefined>(undefined);

  const monitor = useMonitor().data;

  const processing = monitor?.status === "PROCESSING" || monitor?.filter.status === "PROCESSING";
  const count = processing ? 0 : monitor?.filter.numFilteredEntries ?? 0;

  const { noChanges, skipFilter } = useMonitorFilters();

  return (
    <VStack w="full" spacing={0}>
      <HStack as={Button} variant="ghost" w={80} onClick={() => setExpanded(!expanded)}>
        <Text>Created Entries</Text>
        <Skeleton isLoaded={!processing && count !== undefined}>
          <Text>
            ({count.toLocaleString()}
            {!skipFilter && " matches"})
          </Text>
        </Skeleton>

        <Icon as={expanded ? FaChevronUp : FaChevronDown} />
      </HStack>
      <HStack pt={2} spacing={1} h={4}>
        {!noChanges && (
          <>
            <Icon as={FiAlertTriangle} color="yellow.500" boxSize={3} />
            <LabelText fontSize="xs">Save filters to update results</LabelText>
          </>
        )}
      </HStack>

      <Collapse in={expanded} style={{ width: "100%" }}>
        <VStack w="full">
          <HStack w="full" justifyContent="space-between" pb={4}>
            <Box>
              {!skipFilter && (
                <FilterOutputSelector
                  selectedOutput={selectedOutput}
                  setSelectedOutput={setSelectedOutput}
                />
              )}
            </Box>

            <ProjectLink
              href={{
                pathname: "/monitors/[id]/[tab]",
                query: { id: monitor?.id, tab: MONITOR_RESULTS_KEY },
              }}
              target="_blank"
            >
              <ActionButton icon={FaExternalLinkAlt} iconBoxSize={3.5} label="View All" />
            </ProjectLink>
          </HStack>
          <FilteredNodeEntriesTable
            filters={addFilterOutcomeFilter({
              filterOutcome: selectedOutput,
            })}
          />
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default SecondaryResultsBlock;
