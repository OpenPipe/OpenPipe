import { Text, VStack } from "@chakra-ui/react";
import type { DatasetEntryOutput } from "@prisma/client";
import type { ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";

export const PotentiallyPendingFormattedMessage = ({
  output,
  preferJson = false,
}: {
  output: DatasetEntryOutput["output"];
  preferJson?: boolean;
}) => {
  if (output) {
    return (
      <FormattedMessage
        message={output as unknown as ChatCompletionMessage}
        preferJson={preferJson}
      />
    );
  }
  return <Text color="gray.500">Pending</Text>;
};

const FormattedMessage = ({
  message,
  preferJson = false,
}: {
  message: ChatCompletionMessage;
  preferJson?: boolean;
}) => {
  if (message.tool_calls) {
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap" w="full">
        <Text fontWeight="bold" color="gray.500">
          tool_calls
        </Text>
        {message.tool_calls.map((toolCall, index) => {
          const fn = toolCall.function;

          return <HighlightedJson key={index} fnLabel={fn.name} json={fn.arguments} />;
        })}
      </VStack>
    );
  }

  if (preferJson) {
    return <HighlightedJson json={message.content ?? ""} />;
  }

  return (
    <Text whiteSpace="pre-wrap" maxW="full">
      {message.content}
    </Text>
  );
};

const HighlightedJson = (props: { json: string; fnLabel?: string }) => {
  let formattedJson = props.json;

  try {
    formattedJson = JSON.stringify(JSON.parse(props.json), null, 2);
  } catch (e) {}

  return (
    <VStack w="full" alignItems="flex-start" bgColor="gray.50" borderRadius={4}>
      <SyntaxHighlighter
        customStyle={{
          overflowX: "unset",
          width: "100%",
          flex: 1,
          backgroundColor: "transparent",
          fontSize: 14,
        }}
        language="javascript"
        lineProps={{
          style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
        }}
        wrapLines
      >
        {props.fnLabel ? `${props.fnLabel}(${formattedJson})` : formattedJson}
      </SyntaxHighlighter>
    </VStack>
  );
};

export default FormattedMessage;
