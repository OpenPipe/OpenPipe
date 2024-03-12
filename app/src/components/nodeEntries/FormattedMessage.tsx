import { Text, VStack } from "@chakra-ui/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";

const FormattedMessage = ({
  message,
  preferJson,
  includeField,
}: {
  message: ChatCompletionMessageParam;
  preferJson?: boolean;
  includeField?: boolean;
}) => {
  if ("tool_calls" in message && message.tool_calls?.length) {
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap" w="full">
        {includeField && (
          <Text fontWeight="bold" color="gray.500">
            tool_calls
          </Text>
        )}
        {message.tool_calls.map((toolCall, index) => {
          const fn = toolCall.function;

          return <HighlightedJson key={index} fnLabel={fn.name} json={fn.arguments} />;
        })}
      </VStack>
    );
  }

  if (preferJson && typeof message.content === "string") {
    return (
      <VStack alignItems="flex-start" w="full">
        {includeField && (
          <Text fontWeight="bold" color="gray.500">
            content (json)
          </Text>
        )}
        <HighlightedJson json={message.content ?? ""} />;
      </VStack>
    );
  }

  return (
    <VStack alignItems="flex-start" w="full">
      {includeField && (
        <Text fontWeight="bold" color="gray.500">
          content
        </Text>
      )}
      <Text whiteSpace="pre-wrap" maxW="full">
        {message.content?.toString()}
      </Text>
    </VStack>
  );
};

export default FormattedMessage;

const HighlightedJson = (props: { json: string; fnLabel?: string }) => {
  let formattedJson = props.json;

  try {
    formattedJson = JSON.stringify(JSON.parse(props.json), null, 2);
  } catch (e) {}

  return (
    <VStack w="full" alignItems="flex-start" bgColor="#f0f0f0" borderRadius={8}>
      <SyntaxHighlighter
        customStyle={{
          overflowX: "unset",
          width: "100%",
          flex: 1,
          backgroundColor: "transparent",
          fontSize: "14px",
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
