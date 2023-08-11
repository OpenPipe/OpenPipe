import {
  Box,
  Card,
  CardHeader,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Tooltip,
  Collapse,
  HStack,
  VStack,
  IconButton,
  useToast,
  Icon,
  Button,
  ButtonGroup,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ChevronUpIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { type RouterOutputs, api } from "~/utils/api";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atelierCaveLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";
import Link from "next/link";

dayjs.extend(relativeTime);

type LoggedCall = RouterOutputs["dashboard"]["loggedCalls"][0];

const FormattedJson = ({ json }: { json: any }) => {
  const jsonString = stringify(json, { maxLength: 40 });
  const toast = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy to clipboard",
        status: "error",
        duration: 2000,
      });
    }
  };

  return (
    <Box position="relative" fontSize="sm" borderRadius="md" overflow="hidden">
      <SyntaxHighlighter
        customStyle={{ overflowX: "unset" }}
        language="json"
        style={atelierCaveLight}
        lineProps={{
          style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
        }}
        wrapLines
      >
        {jsonString}
      </SyntaxHighlighter>
      <IconButton
        aria-label="Copy"
        icon={<CopyIcon />}
        position="absolute"
        top={1}
        right={1}
        size="xs"
        variant="ghost"
        onClick={() => void copyToClipboard(jsonString)}
      />
    </Box>
  );
};

function TableRow({
  loggedCall,
  isExpanded,
  onToggle,
}: {
  loggedCall: LoggedCall;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isError = loggedCall.modelResponse?.statusCode !== 200;
  const timeAgo = dayjs(loggedCall.requestedAt).fromNow();
  const fullTime = dayjs(loggedCall.requestedAt).toString();

  const model = useMemo(
    () => loggedCall.tags.find((tag) => tag.name.startsWith("$model"))?.value,
    [loggedCall.tags],
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
          <Icon boxSize={6} as={isExpanded ? ChevronUpIcon : ChevronDownIcon} />
        </Td>
        <Td>
          <Tooltip label={fullTime} placement="top">
            <Box whiteSpace="nowrap" minW="120px">
              {timeAgo}
            </Box>
          </Tooltip>
        </Td>
        <Td width="100%">{model}</Td>
        <Td isNumeric>{((loggedCall.modelResponse?.durationMs ?? 0) / 1000).toFixed(2)}s</Td>
        <Td isNumeric>{loggedCall.modelResponse?.inputTokens}</Td>
        <Td isNumeric>{loggedCall.modelResponse?.outputTokens}</Td>
        <Td sx={{ color: isError ? "red.500" : "green.500", fontWeight: "semibold" }} isNumeric>
          {loggedCall.modelResponse?.respStatus ?? "No response"}
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
}

export default function LoggedCallTable() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const loggedCalls = api.dashboard.loggedCalls.useQuery({});

  return (
    <Card variant="outline" width="100%" overflow="hidden">
      <CardHeader>
        <Heading as="h3" size="sm">
          Logged Calls
        </Heading>
      </CardHeader>
      <Table>
        <Thead>
          <Tr>
            <Th />
            <Th>Time</Th>
            <Th>Model</Th>
            <Th isNumeric>Duration</Th>
            <Th isNumeric>Input tokens</Th>
            <Th isNumeric>Output tokens</Th>
            <Th isNumeric>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {loggedCalls.data?.map((loggedCall) => {
            return (
              <TableRow
                key={loggedCall.id}
                loggedCall={loggedCall}
                isExpanded={loggedCall.id === expandedRow}
                onToggle={() => {
                  if (loggedCall.id === expandedRow) {
                    setExpandedRow(null);
                  } else {
                    setExpandedRow(loggedCall.id);
                  }
                }}
              />
            );
          })}
        </Tbody>
      </Table>
    </Card>
  );
}
