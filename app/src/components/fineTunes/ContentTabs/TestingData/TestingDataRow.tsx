import { Th, Td, Thead, Tr, Text, VStack } from "@chakra-ui/react";
import { type ChatCompletionMessage } from "openai/resources/chat";

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

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const TestingDataRow = ({
  prunedInput,
  output,
  datasetEntry: { output: originalOutput },
  errorMessage,
}: {
  prunedInput: TestingEntry["prunedInput"];
  output: TestingEntry["output"];
  outputTokens: number | null;
  datasetEntry: TestingEntry["datasetEntry"];
  errorMessage?: string;
}) => {
  return (
    <Tr
      alignItems="flex-start"
      sx={{
        td: { verticalAlign: "top" },
      }}
    >
      <Td>
        <FormattedInput prunedInput={prunedInput} />
      </Td>
      <Td
        sx={{
          borderLeft: "1px solid",
          borderRight: "1px solid",
          borderColor: "gray.100",
        }}
      >
        <FormattedOutput output={originalOutput} />
      </Td>
      <Td>
        <FormattedOutput output={output} errorMessage={errorMessage} />
      </Td>
    </Tr>
  );
};

const FormattedInput = ({ prunedInput }: { prunedInput: TestingEntry["prunedInput"] }) => {
  let parsedInput = null;
  try {
    parsedInput = JSON.parse(prunedInput) as unknown as ChatCompletionMessage[];
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
  errorMessage,
}: {
  output: TestingEntry["output"];
  errorMessage?: string | null;
}) => {
  if (errorMessage) {
    return <Text color="red.500">{errorMessage}</Text>;
  }

  if (!output) return <Text color="gray.500">Pending</Text>;

  const message = output as unknown as ChatCompletionMessage;
  return <FormattedMessage message={message} />;
};

const FormattedMessage = ({ message }: { message: ChatCompletionMessage }) => {
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
      <VStack alignItems="flex-start">
        <Text fontWeight="bold">{name}</Text>
        {args &&
          (parsedArgs ? (
            <Text>{JSON.stringify(JSON.parse(args), null, 4)}</Text>
          ) : (
            <Text>{args}</Text>
          ))}
      </VStack>
    );
  }
  return <Text>{message.content}</Text>;
};

export default TestingDataRow;