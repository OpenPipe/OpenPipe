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
} from "@chakra-ui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo } from "react";
import Link from "next/link";

import { type RouterOutputs } from "~/utils/api";
import { FormattedJson } from "./FormattedJson";

dayjs.extend(relativeTime);

type LoggedCall = RouterOutputs["loggedCalls"]["list"]["calls"][0];

export const TableHeader = () => (
  <Thead>
    <Tr>
      <Th>Time</Th>
      <Th>Model</Th>
      <Th isNumeric>Duration</Th>
      <Th isNumeric>Input tokens</Th>
      <Th isNumeric>Output tokens</Th>
      <Th isNumeric>Status</Th>
    </Tr>
  </Thead>
);

export const TableRow = ({
  loggedCall,
  isExpanded,
  onToggle,
}: {
  loggedCall: LoggedCall;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const isError = loggedCall.modelResponse?.statusCode !== 200;
  const timeAgo = dayjs(loggedCall.requestedAt).fromNow();
  const fullTime = dayjs(loggedCall.requestedAt).toString();

  const model = useMemo(
    () => loggedCall.tags.find((tag) => tag.name.startsWith("$model"))?.value,
    [loggedCall.tags],
  );

  const durationCell = (
    <Td isNumeric>
      {loggedCall.cacheHit
        ? "Cache hit"
        : ((loggedCall.modelResponse?.durationMs ?? 0) / 1000).toFixed(2) + "s"}
    </Td>
  );

  return (
    <>
      <Tr
        onClick={onToggle}
        key={loggedCall.id}
        _hover={{ bgColor: "gray.100", cursor: "pointer" }}
        sx={{
          "> td": { borderBottom: "none" },
        }}
      >
        <Td>
          <Tooltip label={fullTime} placement="top">
            <Box whiteSpace="nowrap" minW="120px">
              {timeAgo}
            </Box>
          </Tooltip>
        </Td>
        <Td width="100%">
          <HStack justifyContent="flex-start">
            <Text
              colorScheme="purple"
              color="purple.500"
              borderColor="purple.500"
              px={1}
              borderRadius={4}
              borderWidth={1}
              fontSize="xs"
            >
              {model}
            </Text>
          </HStack>
        </Td>
        {durationCell}
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
