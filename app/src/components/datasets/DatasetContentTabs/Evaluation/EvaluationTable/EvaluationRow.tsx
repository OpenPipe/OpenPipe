import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Text, VStack, HStack, GridItem, Box, Button, Icon } from "@chakra-ui/react";
import { type ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import ColoredPercent from "~/components/ColoredPercent";
import { type RouterOutputs } from "~/utils/api";
import FineTuneHeading from "./FineTuneHeading";

export const TableHeader = ({ visibleFineTuneIds }: { visibleFineTuneIds: string[] }) => {
  const sharedProps = {
    borderLeftWidth: 1,
  };
  return (
    <>
      <GridItem borderLeftWidth={0}>
        <Text fontWeight="bold" color="gray.500">
          Input
        </Text>
      </GridItem>
      <GridItem {...sharedProps}>
        <Text fontWeight="bold" color="gray.500">
          Original Output
        </Text>
      </GridItem>
      {visibleFineTuneIds.map((fineTuneId) => (
        <GridItem key={fineTuneId} {...sharedProps}>
          <FineTuneHeading fineTuneId={fineTuneId} />
        </GridItem>
      ))}
    </>
  );
};

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const EvaluationRow = ({
  messages,
  output,
  fineTuneEntries,
  visibleFineTuneIds,
}: {
  messages: TestingEntry["messages"];
  output: TestingEntry["output"];
  fineTuneEntries: TestingEntry["fineTuneTestDatasetEntries"];
  visibleFineTuneIds: string[];
}) => {
  const orderedFineTuneEntries = visibleFineTuneIds.map(
    (fineTuneId) =>
      fineTuneEntries.find((entry) => entry.fineTuneId === fineTuneId) || {
        fineTuneId,
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
      <FormattedInputGridItem messages={messages} maxOutputHeight={maxOutputHeight} />
      <FormattedOutputGridItem output={output} onHeightUpdated={onHeightUpdated} />
      {orderedFineTuneEntries.map((entry) => (
        <FormattedOutputGridItem
          key={entry.fineTuneId}
          output={entry.output}
          errorMessage={entry.errorMessage}
          score={entry.score}
          onHeightUpdated={onHeightUpdated}
        />
      ))}
    </>
  );
};

const VERTICAL_PADDING = 32;
const FormattedInputGridItem = ({
  messages,
  maxOutputHeight,
}: {
  messages: TestingEntry["messages"];
  maxOutputHeight: number;
}) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [innerContentHeight, setInnerContentHeight] = useState(0);
  useLayoutEffect(() => {
    if (inputRef.current) {
      setInnerContentHeight(inputRef.current.getBoundingClientRect().height);
    }
  }, [maxOutputHeight]);

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
        {(messages as unknown as ChatCompletionMessage[]).map((message, index) => (
          <VStack key={index} alignItems="flex-start" w="full">
            <Text fontWeight="bold" color="gray.500">
              {message.role}
            </Text>
            <FormattedMessage message={message} />
          </VStack>
        ))}
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
          <HStack w="full" h={6} alignItems="flex-end" justifyContent="center" bgColor="white">
            <Button
              variant="link"
              colorScheme="blue"
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

type FormattedOutputProps = {
  output: TestingEntry["output"];
  score?: number | null;
  errorMessage?: string | null;
};

const FormattedOutputGridItem = ({
  output,
  score,
  errorMessage,
  onHeightUpdated,
}: FormattedOutputProps & { onHeightUpdated: (height: number) => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      if (height > 0) {
        onHeightUpdated(height);
      }
    }
  });
  return (
    <GridItem borderTopWidth={1} borderLeftWidth={1}>
      <Box ref={ref}>
        <FormattedOutput output={output} score={score} errorMessage={errorMessage} />
      </Box>
    </GridItem>
  );
};

const FormattedOutput = ({ output, score, errorMessage }: FormattedOutputProps) => {
  if (errorMessage) {
    return <Text color="red.500">{errorMessage}</Text>;
  }

  if (!output) return <Text color="gray.500">Pending</Text>;

  const message = output as unknown as ChatCompletionMessage;
  return <FormattedMessage message={message} score={score} />;
};

const FormattedMessage = ({
  message,
  score,
}: {
  message: ChatCompletionMessage;
  score?: number | null;
}) => {
  if (message.function_call) {
    const { name, arguments: args } = message.function_call;
    let parsedArgs = null;
    try {
      if (args) parsedArgs = JSON.parse(args);
    } catch (e) {
      // ignore
    }
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap">
        <HStack justifyContent="space-between" w="full">
          <Text fontWeight="bold">{name}</Text>
          {score !== null && score !== undefined && <ColoredPercent value={score} />}
        </HStack>
        {args &&
          (parsedArgs ? (
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
          ) : (
            <Text>{args}</Text>
          ))}
      </VStack>
    );
  }
  return <Text>{message.content}</Text>;
};

export default EvaluationRow;
