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
import type { ChatCompletionMessage } from "openai/resources/chat";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import { type RouterOutputs } from "~/utils/api";
import ModelHeader from "./ModelHeader";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { useVisibleEvalIds } from "../useVisibleEvalIds";
import EvalResults from "./EvalResults";
import FormattedMessage from "../FormattedMessage";
import { useVisibleModelIds } from "../useVisibleModelIds";

export const TableHeader = () => {
  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const sharedProps = {
    position: "sticky",
    top: 0,
    bgColor: "white",
    borderBottomWidth: 1,
    zIndex: 1,
  };
  return (
    <>
      <GridItem
        sx={sharedProps}
        bgColor="white"
        borderTopLeftRadius={4}
        borderTopRightRadius={visibleModelIds.length === 0 ? 4 : 0}
      >
        <Text fontWeight="bold" color="gray.500">
          Input
        </Text>
      </GridItem>
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

const EvaluationRow = ({ entry }: { entry: TestingEntry }) => {
  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const orderedModelEntries = visibleModelIds.map((modelId) => {
    if (modelId === ORIGINAL_MODEL_ID) {
      return { modelId, output: entry.output, errorMessage: null, score: null };
    } else {
      return (
        entry.fineTuneTestDatasetEntries.find((ft) => ft.modelId === modelId) || {
          modelId,
          output: null,
          errorMessage: null,
          score: null,
        }
      );
    }
  });

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
      {orderedModelEntries.map((ftEntry) => {
        return (
          <FormattedOutputGridItem
            key={ftEntry.modelId}
            entry={ftEntry}
            datasetEntryId={entry.id}
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

type FTEntry = Partial<TestingEntry["fineTuneTestDatasetEntries"][number]>;

const FormattedOutputGridItem = ({
  entry,
  datasetEntryId,
  evalResults,
  onHeightUpdated,
}: {
  entry: FTEntry;
  datasetEntryId: string;
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
      <VStack ref={ref} w="full" alignItems="flex-start" justifyContent="space-between" h="full">
        <FormattedOutput entry={entry} />
        <EvalResults
          datasetEntryId={datasetEntryId}
          modelId={entry.modelId}
          results={applicableResults}
        />
      </VStack>
    </GridItem>
  );
};

export const FormattedOutput = ({ entry }: { entry: FTEntry }) => {
  if (entry.errorMessage) {
    return <Text color="red.500">{entry.errorMessage}</Text>;
  }

  if (!entry.output) return <Text color="gray.500">Pending</Text>;

  const message = entry.output as unknown as ChatCompletionMessage;
  return (
    <VStack w="full">
      <FormattedMessage message={message} />
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
    </VStack>
  );
};

export default EvaluationRow;
