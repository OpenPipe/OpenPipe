import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  VStack,
  HStack,
  GridItem,
  Box,
  Button,
  Icon,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall, ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import ColoredPercent from "~/components/ColoredPercent";
import { type RouterOutputs } from "~/utils/api";
import ModelHeader from "./ModelHeader";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { useVisibleEvalIds } from "../useVisibleEvalIds";
import EvalResults from "./EvalResults";

export const TableHeader = ({
  showOriginalOutput,
  visibleModelIds,
}: {
  showOriginalOutput: boolean;
  visibleModelIds: string[];
}) => {
  const sharedProps = {
    position: "sticky",
    top: 0,
    bgColor: "white",
    borderBottomWidth: 1,
    zIndex: 1,
  };
  return (
    <>
      <GridItem sx={sharedProps} bgColor="white" borderTopLeftRadius={4}>
        <Text fontWeight="bold" color="gray.500">
          Input
        </Text>
      </GridItem>
      {showOriginalOutput && (
        <GridItem sx={sharedProps} borderLeftWidth={1}>
          <Text fontWeight="bold" color="gray.500">
            Original Output
          </Text>
        </GridItem>
      )}
      {visibleModelIds.map((modelId, i) => (
        <GridItem
          key={modelId}
          sx={sharedProps}
          borderLeftWidth={1}
          borderTopRightRadius={i === visibleModelIds.length - 1 ? 4 : 0}
        >
          <ModelHeader modelId={modelId} />
        </GridItem>
      ))}
    </>
  );
};

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const EvaluationRow = ({
  entry,
  showOriginalOutput,
  visibleModelIds,
}: {
  entry: TestingEntry;
  showOriginalOutput: boolean;
  visibleModelIds: string[];
}) => {
  const orderedModelEntries = visibleModelIds.map(
    (modelId) =>
      entry.fineTuneTestDatasetEntries.find((ft) => ft.modelId === modelId) || {
        modelId,
        output: null,
        errorMessage: null,
        score: null,
      },
  );

  const [maxOutputHeight, setMaxOutputHeight] = useState(0);
  const onHeightUpdated = useCallback(
    (height: number) => {
      if (height > maxOutputHeight) {
        setMaxOutputHeight(height);
      }
    },
    [maxOutputHeight, setMaxOutputHeight],
  );

  return (
    <>
      <FormattedInputGridItem entry={entry} maxOutputHeight={maxOutputHeight} />
      {showOriginalOutput && (
        <FormattedOutputGridItem
          entry={{ datasetEntryId: entry.id, modelId: ORIGINAL_MODEL_ID, output: entry.output }}
          evalResults={entry.datasetEvalResults}
          onHeightUpdated={onHeightUpdated}
        />
      )}
      {orderedModelEntries.map((ftEntry) => {
        const x = ftEntry.modelId;
        return (
          <FormattedOutputGridItem
            key={ftEntry.modelId}
            entry={ftEntry}
            evalResults={entry.datasetEvalResults}
            onHeightUpdated={onHeightUpdated}
          />
        );
      })}
    </>
  );
};

const VERTICAL_PADDING = 32;
const FormattedInputGridItem = ({
  entry,
  maxOutputHeight,
}: {
  entry: TestingEntry;
  maxOutputHeight: number;
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [innerContentHeight, setInnerContentHeight] = useState(0);
  useLayoutEffect(() => {
    if (inputRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Update the state with the new height
          setInnerContentHeight(entry.contentRect.height);
        }
      });

      // Start observing the element's size
      resizeObserver.observe(inputRef.current);

      return () => resizeObserver.disconnect();
    }
  }, []);

  const [isExpanded, setIsExpanded] = useState(false);
  const expandable = innerContentHeight > maxOutputHeight + VERTICAL_PADDING;

  return (
    <GridItem
      position="relative"
      borderTopWidth={1}
      h={isExpanded || !expandable ? innerContentHeight + 52 : maxOutputHeight + VERTICAL_PADDING}
      overflow="hidden"
      transition="height 0.5s ease-in-out"
    >
      <VStack ref={inputRef} alignItems="flex-start" spacing={8}>
        {(entry.messages as unknown as ChatCompletionMessage[]).map((message, index) => (
          <VStack key={index} alignItems="flex-start" w="full">
            <Text fontWeight="bold" color="gray.500">
              {message.role}
            </Text>
            <FormattedMessage message={message} />
          </VStack>
        ))}
        <Text color="gray.500">
          <Text as="span" fontWeight="bold">
            ID:
          </Text>{" "}
          {entry.id}
        </Text>
      </VStack>
      {expandable && (
        <VStack position="absolute" bottom={0} w="full" spacing={0}>
          {!isExpanded && (
            <Box
              w="full"
              h={16}
              background="linear-gradient(to bottom, transparent, white)"
              pointerEvents="none"
            />
          )}
          <HStack w="full" h={8} alignItems="flex-end" justifyContent="center" bgColor="white">
            <Button
              variant="link"
              colorScheme="gray"
              py={2}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <HStack spacing={0}>
                  <Text>Show less</Text>
                  <Icon as={FiChevronUp} mt={1} boxSize={5} />
                </HStack>
              ) : (
                <HStack spacing={0}>
                  <Text>Show more</Text>
                  <Icon as={FiChevronDown} mt={1} boxSize={5} />
                </HStack>
              )}
            </Button>
          </HStack>
        </VStack>
      )}
    </GridItem>
  );
};

type FTEntry = Partial<TestingEntry["fineTuneTestDatasetEntries"][number]> & {
  datasetEntryId?: string;
};

const FormattedOutputGridItem = ({
  entry,
  evalResults,
  onHeightUpdated,
}: {
  entry: FTEntry;
  evalResults: TestingEntry["datasetEvalResults"];
  onHeightUpdated: (height: number) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const visibleEvalIds = useVisibleEvalIds().visibleEvalIds;

  useLayoutEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      if (height > 0) {
        onHeightUpdated(height);
      }
    }
  }, [visibleEvalIds, onHeightUpdated]);

  const applicableResults = useMemo(
    () => evalResults.filter((result) => result.modelId === entry.modelId),
    [evalResults, entry.modelId],
  );

  return (
    <GridItem borderTopWidth={1} borderLeftWidth={1}>
      <VStack ref={ref} w="full" alignItems="flex-start">
        <FormattedOutput entry={entry} />
        <EvalResults
          datasetEntryId={entry.datasetEntryId}
          modelId={entry.modelId}
          results={applicableResults}
        />
      </VStack>
    </GridItem>
  );
};

const FormattedOutput = ({ entry }: { entry: FTEntry }) => {
  if (entry.errorMessage) {
    return <Text color="red.500">{entry.errorMessage}</Text>;
  }

  if (!entry.output) return <Text color="gray.500">Pending</Text>;

  const message = entry.output as unknown as ChatCompletionMessage;
  return (
    <>
      <FormattedMessage message={message} score={entry.score} />
      {entry.finishReason === "length" && (
        <Alert status="warning" mt={4} zIndex={0}>
          <AlertIcon />
          <AlertDescription>
            This completion was cut off because it reached the maximum number of tokens the base
            model supports. It used <b>{entry.inputTokens ?? "uknown"}</b> input tokens and{" "}
            <b>{entry.outputTokens ?? "unknown"}</b> output tokens.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

const FormattedMessage = ({
  message,
  score,
}: {
  message: ChatCompletionMessage;
  score?: number | null;
}) => {
  if (message.tool_calls) {
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap" w="full">
        {message.tool_calls.map((toolCall, index) => (
          <FormattedToolCall key={index} toolCall={toolCall} />
        ))}
        <HStack justifyContent="flex-end" w="full">
          {score !== null && score !== undefined && <ColoredPercent value={score} />}
        </HStack>
      </VStack>
    );
  }
  return <Text whiteSpace="pre-wrap">{message.content}</Text>;
};

const FormattedToolCall = ({ toolCall }: { toolCall: ChatCompletionMessageToolCall }) => {
  const { name, arguments: args } = toolCall.function;

  let parsedArgs = null;
  try {
    if (args) parsedArgs = JSON.parse(args);
  } catch (e) {
    // ignore
  }

  if (parsedArgs) {
    return (
      <VStack w="full" alignItems="flex-start">
        <Text fontWeight="bold">{name}</Text>
        <SyntaxHighlighter
          customStyle={{
            overflowX: "unset",
            width: "100%",
            flex: 1,
            backgroundColor: "#f0f0f0",
          }}
          language="json"
          lineProps={{
            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
          }}
          wrapLines
        >
          {JSON.stringify(JSON.parse(args), null, 4)}
        </SyntaxHighlighter>
      </VStack>
    );
  }

  return <Text maxW="full">{args}</Text>;
};

export default EvaluationRow;
