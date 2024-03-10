import { VStack, Text } from "@chakra-ui/react";
import type { DatasetEntryInput } from "@prisma/client";
import type { ChatCompletionMessage } from "openai/resources/chat";
import FormattedMessage from "./FormattedMessage";
import { FormattedJson } from "../FormattedJson";

const FormattedInput = ({
  input: { messages, tool_choice, tools },
}: {
  input: {
    messages: DatasetEntryInput["messages"];
    tool_choice?: DatasetEntryInput["tool_choice"];
    tools?: DatasetEntryInput["tools"];
  };
}) => {
  return (
    <VStack spacing={8} maxW="full">
      {(messages as unknown as ChatCompletionMessage[]).map((message, index) => (
        <VStack key={index} alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            {message.role}
          </Text>
          <FormattedMessage message={message} />
        </VStack>
      ))}
      {tool_choice && (
        <VStack alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            tool_choice
          </Text>
          <FormattedJson json={tool_choice} copiable={false} borderWidth={0} />
        </VStack>
      )}
      {tools && (
        <VStack alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            tools
          </Text>
          <FormattedJson copiable={false} json={tools} borderWidth={0} />
        </VStack>
      )}
    </VStack>
  );
};

export default FormattedInput;