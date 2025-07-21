import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import { type RouterOutputs } from "~/utils/api";
import ModelHeader from "./ModelHeader";
import { ORIGINAL_MODEL_ID, typedDatasetEntryInput } from "~/types/dbColumns.types";
import { useVisibleEvalIds } from "../useVisibleEvalIds";
import EvalResults from "./EvalResults";
import { useVisibleModelIds } from "../useVisibleModelIds";
import FormattedInput from "~/components/nodeEntries/FormattedInput";
import FormattedOutput from "~/components/nodeEntries/FormattedOutput";
import { pick } from "lodash-es";

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

type TestingEntry = RouterOutputs["nodeEntries"]["listTestingEntries"]["entries"][number];

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

  const preferJson = typedDatasetEntryInput(entry).response_format?.type === "json_object";

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
            preferJson={preferJson}
          />
        );
      })}
    </>
  );
};

const VERTICAL_PADDING = 32;
const MAX_HEIGHT = 500;
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
  const maxHeight = Math.min(Math.max(MAX_HEIGHT, maxOutputHeight), innerContentHeight + 52);

  // Scroll to the end of the content when not expanded
  useEffect(() => {
    if (inputRef.current && !isExpanded) {
      inputRef.current.scrollTop = inputRef.current.scrollHeight;
    }
  }, [isExpanded]);

  return (
    <GridItem
      position="relative"
      borderTopWidth={1}
      h={isExpanded || !expandable ? maxHeight : maxOutputHeight + VERTICAL_PADDING}
      overflowY={isExpanded && innerContentHeight > maxHeight ? "auto" : "hidden"}
      overflowX="hidden"
      transition="height 0.5s ease-in-out"
    >
      <VStack
        ref={inputRef}
        alignItems="flex-start"
        spacing={8}
        position={expandable && !isExpanded ? "absolute" : "relative"}
        bottom={expandable && !isExpanded ? `${VERTICAL_PADDING}px` : "auto"}
      >
        <FormattedInput input={pick(entry, ["messages"])} />
      </VStack>
      {expandable && (
        <VStack position="absolute" top={0} w="full" spacing={0}>
          <HStack
            w="full"
            h={8}
            alignItems="flex-start"
            justifyContent="center"
            bgColor={isExpanded ? "transparent" : "white"}
          >
            <Button
              variant="link"
              colorScheme="gray"
              py={2}
              onClick={() => setIsExpanded(!isExpanded)}
              fontSize="inherit"
            >
              {isExpanded ? (
                <HStack spacing={0}>
                  <Text>Show less</Text> <Icon as={FiChevronDown} mt={1} boxSize={5} />
                </HStack>
              ) : (
                <HStack spacing={0}>
                  <Text>Show more</Text> <Icon as={FiChevronUp} mt={1} boxSize={5} />
                </HStack>
              )}
            </Button>
          </HStack>
          {!isExpanded && (
            <Box
              w="full"
              h={16}
              background="linear-gradient(to top, transparent, white)"
              pointerEvents="none"
            />
          )}
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
  preferJson,
}: {
  entry: FTEntry;
  datasetEntryId: string;
  evalResults: TestingEntry["datasetEvalResults"];
  onHeightUpdated: (height: number) => void;
  preferJson: boolean;
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
        <PotentiallyPendingOutput entry={entry} preferJson={preferJson} />
        <EvalResults
          nodeEntryId={datasetEntryId}
          modelId={entry.modelId}
          results={applicableResults}
        />
      </VStack>
    </GridItem>
  );
};

const PotentiallyPendingOutput = ({
  entry,
  preferJson,
}: {
  entry: FTEntry;
  preferJson: boolean;
}) => {
  if (entry.errorMessage) {
    if (entry.errorMessage === "Pending") {
      return <Text color="gray.500">Pending</Text>;
    }
    return <Text color="red.500">{entry.errorMessage}</Text>;
  }

  if (!entry.output) return <Text color="gray.500">Pending</Text>;

  return (
    <VStack w="full" alignItems="flex-start">
      <FormattedOutput output={entry.output} preferJson={preferJson} />
      {entry.finishReason === "length" && (
        <Alert status="warning" mt={4} zIndex={0}>
          <AlertIcon />
          <AlertDescription>
            This completion was cut off because it reached the maximum number of tokens the base
            model supports. It used <b>{entry.inputTokens ?? "unknown"}</b> input tokens and{" "}
            <b>{entry.outputTokens ?? "unknown"}</b> output tokens.
          </AlertDescription>
        </Alert>
      )}
    </VStack>
  );
};

export default EvaluationRow;
