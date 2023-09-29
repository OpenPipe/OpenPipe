import { useState } from "react";
import { Td, Thead, Tr, Text, Collapse, VStack } from "@chakra-ui/react";
import { type ChatCompletionMessage } from "openai/resources/chat";

import { type RouterOutputs } from "~/utils/api";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Td w="30%">Input</Td>
        <Td w="35%">Original Output</Td>
        <Td>Generated Output</Td>
      </Tr>
    </Thead>
  );
};

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const TestingDataRow = ({
  output,
  outputTokens,
  datasetEntry: {
    input: originalInput,
    inputTokens: originalInputTokens,
    output: originalOutput,
    outputTokens: originalOutputTokens,
  },
  errorMessage,
}: {
  output: TestingEntry["output"];
  outputTokens: number | null;
  datasetEntry: TestingEntry["datasetEntry"];
  errorMessage?: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const noOfLines = isExpanded ? undefined : 4;

  let outputHeaderElement = <Text color="gray.500">Pending</Text>;
  if (errorMessage) {
    outputHeaderElement = <Text>Error</Text>;
  } else if (outputTokens !== null) {
    outputHeaderElement = <Text>{outputTokens} tokens</Text>;
  }

  return (
    <>
      <Tr
        onClick={() => setIsExpanded(!isExpanded)}
        alignItems="flex-start"
        cursor="pointer"
        _hover={{ bgColor: "gray.50" }}
        sx={{
          td: { borderBottom: "none" },
        }}
      >
        <Td>{originalInputTokens} tokens</Td>
        <Td>{originalOutputTokens} tokens</Td>
        <Td>{outputHeaderElement}</Td>
      </Tr>
      <Tr sx={{ td: { verticalAlign: "top" } }}>
        <Td py={isExpanded ? 4 : 0}>
          <Collapse in={isExpanded}>
            <Text
              noOfLines={noOfLines}
              h="full"
              whiteSpace="pre-wrap"
              p={4}
              bgColor="orange.50"
              borderRadius={4}
            >
              {JSON.stringify(originalInput, null, 4)}
            </Text>
          </Collapse>
        </Td>
        <Td py={isExpanded ? 4 : 0}>
          <Collapse in={isExpanded}>
            <Text
              noOfLines={noOfLines}
              h="full"
              whiteSpace="pre-wrap"
              p={4}
              bgColor="orange.50"
              borderRadius={4}
            >
              <FormattedOutput output={originalOutput} />
            </Text>
          </Collapse>
        </Td>
        <Td py={isExpanded ? 4 : 0}>
          <Collapse in={isExpanded}>
            <Text
              noOfLines={noOfLines}
              h="full"
              whiteSpace="pre-wrap"
              p={4}
              bgColor="orange.50"
              borderRadius={4}
            >
              <FormattedOutput output={output} errorMessage={errorMessage} />
            </Text>
          </Collapse>
        </Td>
      </Tr>
    </>
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
  console.log(message.content);
  return <Text>{message.content}</Text>;
};

export default TestingDataRow;
