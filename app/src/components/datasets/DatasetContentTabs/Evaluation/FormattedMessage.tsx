import { Text, VStack } from "@chakra-ui/react";
import type { DatasetEntry } from "@prisma/client";
import type { ChatCompletionMessageToolCall, ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";

export const PotentiallyPendingFormattedMessage = ({
  output,
}: {
  output: DatasetEntry["output"];
}) => {
  if (output) {
    return <FormattedMessage message={output as unknown as ChatCompletionMessage} />;
  }
  return <Text color="gray.500">Pending</Text>;
};

const FormattedMessage = ({ message }: { message: ChatCompletionMessage }) => {
  if (message.tool_calls) {
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap" w="full">
        {message.tool_calls.map((toolCall, index) => (
          <FormattedToolCall key={index} toolCall={toolCall} />
        ))}
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

export default FormattedMessage;
