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
  Button,
  ButtonGroup,
  Text,
  Checkbox,
} from "@chakra-ui/react";
import Link from "next/link";

import dayjs from "~/utils/dayjs";
import { type RouterOutputs } from "~/utils/api";
import { FormattedJson } from "./FormattedJson";
import { useAppStore } from "~/state/store";
import { useIsClientRehydrated, useLoggedCalls, useTagNames } from "~/utils/hooks";
import { useMemo } from "react";
import { StaticColumnKeys } from "~/state/columnVisiblitySlice";

type LoggedCall = RouterOutputs["loggedCalls"]["list"]["calls"][0];

export const TableHeader = ({ showOptions }: { showOptions?: boolean }) => {
  const matchingLogIds = useLoggedCalls().data?.matchingLogIds;
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const addAll = useAppStore((s) => s.selectedLogs.addSelectedLogIds);
  const clearAll = useAppStore((s) => s.selectedLogs.clearSelectedLogIds);
  const allSelected = useMemo(() => {
    if (!matchingLogIds || !matchingLogIds.length) return false;
    return matchingLogIds.every((id) => selectedLogIds.has(id));
  }, [selectedLogIds, matchingLogIds]);
  const tagNames = useTagNames().data;
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);
  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

  return (
    <Thead>
      <Tr>
        {showOptions && (
          <Th pr={0}>
            <HStack minW={16}>
              <Checkbox
                isChecked={allSelected}
                onChange={() => {
                  allSelected ? clearAll() : addAll(matchingLogIds || []);
                }}
              />
              <Text>
                ({selectedLogIds.size ? `${selectedLogIds.size}/` : ""}
                {matchingLogIds?.length || 0})
              </Text>
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
  const isError = loggedCall.modelResponse?.statusCode !== 200;
  const requestedAt = dayjs(loggedCall.requestedAt).format("MMMM D h:mm A");
  const fullTime = dayjs(loggedCall.requestedAt).toString();

  const isChecked = useAppStore((s) => s.selectedLogs.selectedLogIds.has(loggedCall.id));
  const toggleChecked = useAppStore((s) => s.selectedLogs.toggleSelectedLogId);

  const tagNames = useTagNames().data;
  const visibleColumns = useAppStore((s) => s.columnVisibility.visibleColumns);

  const visibleTagNames = useMemo(() => {
    return tagNames?.filter((tagName) => visibleColumns.has(tagName)) ?? [];
  }, [tagNames, visibleColumns]);

  const isClientRehydrated = useIsClientRehydrated();
  if (!isClientRehydrated) return null;

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
            <Checkbox isChecked={isChecked} onChange={() => toggleChecked(loggedCall.id)} />
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
        {visibleColumns.has(StaticColumnKeys.DURATION) && (
          <Td isNumeric>
            {loggedCall.cacheHit ? (
              <Text color="gray.500">Cached</Text>
            ) : (
              ((loggedCall.modelResponse?.durationMs ?? 0) / 1000).toFixed(2) + "s"
            )}
          </Td>
        )}
        {visibleColumns.has(StaticColumnKeys.INPUT_TOKENS) && (
          <Td isNumeric>{loggedCall.modelResponse?.inputTokens}</Td>
        )}
        {visibleColumns.has(StaticColumnKeys.OUTPUT_TOKENS) && (
          <Td isNumeric>{loggedCall.modelResponse?.outputTokens}</Td>
        )}
        {visibleColumns.has(StaticColumnKeys.STATUS_CODE) && (
          <Td sx={{ color: isError ? "red.500" : "green.500", fontWeight: "semibold" }} isNumeric>
            {loggedCall.modelResponse?.statusCode ?? "No response"}
          </Td>
        )}
      </Tr>
      <Tr>
        <Td colSpan={visibleColumns.size + 1} w="full" p={0}>
          <Collapse in={isExpanded} unmountOnExit={true}>
            <VStack p={4} align="stretch">
              <HStack align="stretch">
                <VStack flex={1} align="stretch">
                  <Heading size="sm">Input</Heading>
                  <FormattedJson json={loggedCall.modelResponse?.reqPayload} />
                </VStack>
                <VStack flex={1} align="stretch">
                  <Heading size="sm">Output</Heading>
                  <FormattedJson json={loggedCall.modelResponse?.respPayload} />
                </VStack>
              </HStack>
              <ButtonGroup alignSelf="flex-end">
                <Button as={Link} colorScheme="blue" href={{ pathname: "/experiments" }}>
                  Experiments
                </Button>
              </ButtonGroup>
            </VStack>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};
