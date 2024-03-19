import { VStack, Text } from "@chakra-ui/react";
import type { DatasetEntryInput } from "@prisma/client";
import { FormattedJson } from "../FormattedJson";
import { typedDatasetEntryInput } from "~/types/dbColumns.types";

const FormattedInput = ({
  input,
}: {
  input: {
    messages: DatasetEntryInput["messages"];
    tool_choice?: DatasetEntryInput["tool_choice"];
    tools?: DatasetEntryInput["tools"];
  };
}) => {
  const { messages, tool_choice, tools } = typedDatasetEntryInput(input);

  return (
    <VStack spacing={8} maxW="full">
      {messages.map((message, index) => (
        <VStack key={index} alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            {message.role}
          </Text>
          <Text whiteSpace="pre-wrap" maxW="full">
            {typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content, null, 2)}
          </Text>
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
