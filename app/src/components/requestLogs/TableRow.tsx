import { useMemo } from "react";
import {
  Box,
  Heading,
  Td,
  Tr,
  Thead,
  Th,
  Tooltip,
  Collapse,
  HStack,
  VStack,
  Text,
  Checkbox,
  Skeleton,
  Link as ChakraLink,
} from "@chakra-ui/react";

import dayjs from "~/utils/dayjs";
import { type RouterOutputs } from "~/utils/api";
import { FormattedJson } from "../FormattedJson";
import { useAppStore } from "~/state/store";
import {
  useIsClientInitialized,
  useLoggedCalls,
  useLoggedCallsCount,
  useTotalNumLogsSelected,
  useSelectedProject,
} from "~/utils/hooks";
import { StaticColumnKeys } from "~/state/columnVisibilitySlice";
import { useFilters } from "../Filters/useFilters";
import { useDateFilter } from "../Filters/useDateFilter";
import { ProjectLink } from "~/components/ProjectLink";

type LoggedCall = RouterOutputs["loggedCalls"]["list"]["calls"][0];

export const TableHeader = ({ showOptions }: { showOptions?: boolean }) => {
  const loggedCallsCount = useLoggedCallsCount();
  const deselectedLogIds = useAppStore((s) => s.selectedLogs.deselectedLogIds);
  const defaultToSelected = useAppStore((s) => s.selectedLogs.defaultToSelected);
  const toggleAllSelected = useAppStore((s) => s.selectedLogs.toggleAllSelected);
  const tagNames = useSelectedProject().data?.tagNames;
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);

  const totalNumLogsSelected = useTotalNumLogsSelected();

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Thead>
      <Tr>
        {showOptions && (
          <Th pr={0}>
            <HStack minW={16}>
              <Checkbox
                isChecked={defaultToSelected && !deselectedLogIds.size && totalNumLogsSelected > 0}
                onChange={toggleAllSelected}
                _hover={{ borderColor: "gray.300" }}
              />
              <Skeleton
                startColor="gray.100"
                endColor="gray.300"
                isLoaded={!loggedCallsCount.isLoading}
                minW={16}
              >
                <Text>
                  ({totalNumLogsSelected ? `${totalNumLogsSelected.toLocaleString()}/` : ""}
                  {(loggedCallsCount.data?.count ?? 0).toLocaleString()})
                </Text>
              </Skeleton>
            </HStack>
          </Th>
        )}
        {visibleColumns.has(StaticColumnKeys.SENT_AT) && <Th>Sent At</Th>}
        {visibleColumns.has(StaticColumnKeys.MODEL) && <Th>Model</Th>}
        {tagNames
          ?.filter((tagName) => visibleColumns.has(tagName))
          .map((tagName) => (
            <Th key={tagName} textTransform={"none"}>
              {tagName}
            </Th>
          ))}
        {visibleColumns.has(StaticColumnKeys.DURATION) && <Th isNumeric>Duration</Th>}
        {visibleColumns.has(StaticColumnKeys.INPUT_TOKENS) && <Th isNumeric>Input tokens</Th>}
        {visibleColumns.has(StaticColumnKeys.OUTPUT_TOKENS) && <Th isNumeric>Output tokens</Th>}
        {visibleColumns.has(StaticColumnKeys.COST) && <Th isNumeric>Cost</Th>}
        {visibleColumns.has(StaticColumnKeys.STATUS_CODE) && <Th isNumeric>Status</Th>}
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  loggedCall,
  isExpanded,
  onToggle,
  showOptions,
}: {
  loggedCall: LoggedCall;
  isExpanded: boolean;
  onToggle: () => void;
  showOptions?: boolean;
}) => {
  const isError = loggedCall.statusCode !== 200;
  const requestedAt = dayjs(loggedCall.requestedAt).format("MMMM D h:mm A");
  const fullTime = dayjs(loggedCall.requestedAt).toString();

  const isChecked = useAppStore(
    (s) =>
      (s.selectedLogs.defaultToSelected && !s.selectedLogs.deselectedLogIds.has(loggedCall.id)) ||
      s.selectedLogs.selectedLogIds.has(loggedCall.id),
  );
  const toggleChecked = useAppStore((s) => s.selectedLogs.toggleSelectedLogId);

  const tagNames = useSelectedProject().data?.tagNames;
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);

  const visibleTagNames = useMemo(() => {
    return tagNames?.filter((tagName) => visibleColumns.has(tagName)) ?? [];
  }, [tagNames, visibleColumns]);

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <>
      <Tr
        onClick={onToggle}
        key={loggedCall.id}
        _hover={{ bgColor: "gray.50", cursor: "pointer" }}
        sx={{
          "> td": { borderBottom: "none" },
        }}
        fontSize="sm"
      >
        {showOptions && (
          <Td>
            <Checkbox
              isChecked={isChecked}
              onChange={() => toggleChecked(loggedCall.id)}
              _hover={{ borderColor: "gray.300" }}
            />
          </Td>
        )}
        {visibleColumns.has(StaticColumnKeys.SENT_AT) && (
          <Td>
            <Tooltip label={fullTime} placement="top">
              <Box whiteSpace="nowrap" minW="120px">
                {requestedAt}
              </Box>
            </Tooltip>
          </Td>
        )}
        {visibleColumns.has(StaticColumnKeys.MODEL) && (
          <Td>
            <HStack justifyContent="flex-start">
              <Text
                colorScheme="purple"
                color="purple.500"
                borderColor="purple.500"
                px={1}
                borderRadius={4}
                borderWidth={1}
                fontSize="xs"
                whiteSpace="nowrap"
              >
                {loggedCall.model}
              </Text>
            </HStack>
          </Td>
        )}
        {visibleTagNames.map((tagName) => (
          <Td key={tagName}>{loggedCall.tags[tagName]}</Td>
        ))}
        {visibleColumns.has(StaticColumnKeys.DURATION) &&
          (loggedCall.cacheHit ? (
            <Td isNumeric>
              <HStack justifyContent="flex-end">
                <Text
                  w="fit-content"
                  textAlign="end"
                  fontSize="2xs"
                  color="gray.500"
                  borderRadius={4}
                  fontWeight="bold"
                  px={1}
                >
                  CACHE
                </Text>
              </HStack>
            </Td>
          ) : (
            <Td isNumeric>{((loggedCall.durationMs ?? 0) / 1000).toFixed(2)}s</Td>
          ))}
        {visibleColumns.has(StaticColumnKeys.INPUT_TOKENS) && (
          <Td isNumeric>{loggedCall.inputTokens}</Td>
        )}
        {visibleColumns.has(StaticColumnKeys.OUTPUT_TOKENS) && (
          <Td isNumeric>{loggedCall.outputTokens}</Td>
        )}
        {visibleColumns.has(StaticColumnKeys.COST) && (
          <Td isNumeric>
            {loggedCall.cost && (
              <Tooltip label={`$${loggedCall.cost.toFixed(6)}`}>
                <Text>${loggedCall.cost.toFixed(3)}</Text>
              </Tooltip>
            )}
          </Td>
        )}
        {visibleColumns.has(StaticColumnKeys.STATUS_CODE) && (
          <Td sx={{ color: isError ? "red.500" : "green.500", fontWeight: "semibold" }} isNumeric>
            {loggedCall.statusCode ?? "No response"}
          </Td>
        )}
      </Tr>
      <Tr maxW="full">
        <Td colSpan={visibleColumns.size + 1} w="full" maxW="full" p={0}>
          <Collapse in={isExpanded} unmountOnExit={true}>
            <HStack align="stretch" px={6} pt={2} pb={4} spacing={4}>
              <VStack flex={1} align="stretch">
                <Heading size="sm">Input</Heading>
                <FormattedJson json={loggedCall.reqPayload} />
              </VStack>
              <VStack flex={1} align="stretch">
                <Heading size="sm">Output</Heading>
                <FormattedJson json={loggedCall.respPayload} />
              </VStack>
            </HStack>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};

export const EmptyTableRow = ({ filtersApplied = true }: { filtersApplied?: boolean }) => {
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const generalFilters = useFilters().filters;
  const dateFilters = useDateFilter().filters;
  const allFilters = [...generalFilters, ...dateFilters];
  const { isFetching, isLoading } = useLoggedCalls();

  if (isLoading || isFetching) {
    return null;
  }

  if (allFilters.length && filtersApplied) {
    return (
      <Tr>
        <Td w="full" colSpan={visibleColumns.size + 1}>
          <Text color="gray.500" textAlign="center" w="full" p={4}>
            No matching request logs found. Try removing some filters or view{" "}
            <ProjectLink href={{ pathname: "/request-logs", query: { dateFilter: "[]" } }}>
              <Text as="b" color="blue.600">
                all
              </Text>
            </ProjectLink>{" "}
            records.
          </Text>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr>
      <Td w="full" colSpan={visibleColumns.size + 1}>
        <Text color="gray.500" textAlign="center" w="full" p={4}>
          This project has no request logs. Learn how to add request logs to your project in our{" "}
          <ChakraLink
            href="https://docs.openpipe.ai/getting-started/quick-start"
            target="_blank"
            color="blue.600"
          >
            Quick Start
          </ChakraLink>{" "}
          guide.
        </Text>
      </Td>
    </Tr>
  );
};
