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
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";

import { type RouterOutputs } from "~/utils/api";
import { FormattedJson } from "./FormattedJson";
import { useAppStore } from "~/state/store";
import { useLoggedCalls, useTagNames } from "~/utils/hooks";
import { useMemo } from "react";

dayjs.extend(relativeTime);

type LoggedCall = RouterOutputs["loggedCalls"]["list"]["calls"][0];

export const TableHeader = ({ showCheckbox }: { showCheckbox?: boolean }) => {
  const matchingLogIds = useLoggedCalls().data?.matchingLogIds;
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const addAll = useAppStore((s) => s.selectedLogs.addSelectedLogIds);
  const clearAll = useAppStore((s) => s.selectedLogs.clearSelectedLogIds);
  const allSelected = useMemo(() => {
    if (!matchingLogIds || !matchingLogIds.length) return false;
    return matchingLogIds.every((id) => selectedLogIds.has(id));
  }, [selectedLogIds, matchingLogIds]);
  const tagNames = useTagNames().data;
  return (
    <Thead>
      <Tr>
        {showCheckbox && (
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
        <Th>Sent At</Th>
        <Th>Model</Th>
        {tagNames?.map((tagName) => <Th key={tagName}>{tagName}</Th>)}
        <Th isNumeric>Duration</Th>
        <Th isNumeric>Input tokens</Th>
        <Th isNumeric>Output tokens</Th>
        <Th isNumeric>Status</Th>
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  loggedCall,
  isExpanded,
  onToggle,
  showCheckbox,
}: {
  loggedCall: LoggedCall;
  isExpanded: boolean;
  onToggle: () => void;
  showCheckbox?: boolean;
}) => {
  const isError = loggedCall.modelResponse?.statusCode !== 200;
  const requestedAt = dayjs(loggedCall.requestedAt).format("MMMM D h:mm A");
  const fullTime = dayjs(loggedCall.requestedAt).toString();

  const isChecked = useAppStore((s) => s.selectedLogs.selectedLogIds.has(loggedCall.id));
  const toggleChecked = useAppStore((s) => s.selectedLogs.toggleSelectedLogId);

  const tagNames = useTagNames().data;

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
        {showCheckbox && (
          <Td>
            <Checkbox isChecked={isChecked} onChange={() => toggleChecked(loggedCall.id)} />
          </Td>
        )}
        <Td>
          <Tooltip label={fullTime} placement="top">
            <Box whiteSpace="nowrap" minW="120px">
              {requestedAt}
            </Box>
          </Tooltip>
        </Td>
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
        {tagNames?.map((tagName) => <Td key={tagName}>{loggedCall.tags[tagName]}</Td>)}
        <Td isNumeric>
          {loggedCall.cacheHit ? (
            <Text color="gray.500">Cached</Text>
          ) : (
            ((loggedCall.modelResponse?.durationMs ?? 0) / 1000).toFixed(2) + "s"
          )}
        </Td>
        <Td isNumeric>{loggedCall.modelResponse?.inputTokens}</Td>
        <Td isNumeric>{loggedCall.modelResponse?.outputTokens}</Td>
        <Td sx={{ color: isError ? "red.500" : "green.500", fontWeight: "semibold" }} isNumeric>
          {loggedCall.modelResponse?.statusCode ?? "No response"}
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={8} p={0}>
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
