import { Text, VStack, HStack } from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall, ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";

import ColoredPercent from "~/components/ColoredPercent";

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

export default FormattedMessage;
