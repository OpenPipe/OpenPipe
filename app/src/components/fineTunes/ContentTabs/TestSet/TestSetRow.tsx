import { Th, Td, Thead, Tr, Text, VStack, HStack } from "@chakra-ui/react";
import { type ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";
import { z } from "zod";
import ColoredPercent from "~/components/ColoredPercent";
import { chatMessage } from "~/types/shared.types";

import { type RouterOutputs } from "~/utils/api";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Th w="30%">Input</Th>
        <Th w="35%">Original Output</Th>
        <Th>Fine-Tuned Model Output</Th>
      </Tr>
    </Thead>
  );
};

type TestingEntry = RouterOutputs["fineTunes"]["listTestingEntries"]["entries"][number];

const TestSetRow = ({
  prunedInput,
  output,
  datasetEntry: { output: originalOutput },
  score,
  errorMessage,
}: {
  prunedInput: TestingEntry["prunedInput"];
  output: TestingEntry["output"];
  outputTokens: number | null;
  datasetEntry: TestingEntry["datasetEntry"];
  score: number | null;
  errorMessage?: string;
}) => {
  return (
    <Tr
      alignItems="flex-start"
      sx={{
        td: { verticalAlign: "top", wordBreak: "break-word" },
      }}
    >
      <Td>
        <FormattedInput prunedInput={prunedInput} />
      </Td>
      <Td borderLeft="1px solid" borderRight="1px solid" borderColor="gray.100">
        <FormattedOutput output={originalOutput} />
      </Td>
      <Td>
        <FormattedOutput output={output} errorMessage={errorMessage} score={score} />
      </Td>
    </Tr>
  );
};

const FormattedInput = ({ prunedInput }: { prunedInput: TestingEntry["prunedInput"] }) => {
  let parsedInput = null;
  try {
    parsedInput = z.array(chatMessage).parse(JSON.parse(prunedInput));
  } catch (e) {
    // ignore
  }

  if (!parsedInput) return <Text>{prunedInput}</Text>;

  return (
    <VStack alignItems="flex-start" spacing={8}>
      {parsedInput.map((message, index) => (
        <VStack key={index} alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            {message.role}
          </Text>
          <FormattedMessage message={message} />
        </VStack>
      ))}
    </VStack>
  );
};

const FormattedOutput = ({
  output,
  score,
  errorMessage,
}: {
  output: TestingEntry["output"];
  score?: number | null;
  errorMessage?: string | null;
}) => {
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
    // return JSON.parse(message.function_call)
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
              // style={docco}
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

export default TestSetRow;
