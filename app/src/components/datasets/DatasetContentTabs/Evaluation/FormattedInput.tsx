import { VStack, Text } from "@chakra-ui/react";
import type { DatasetEntryInput } from "@prisma/client";
import type { ChatCompletionMessage } from "openai/resources/chat";
import FormattedMessage from "./FormattedMessage";

const FormattedDatasetEntryInput = ({ messages }: Pick<DatasetEntryInput, "messages">) => {
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
    </VStack>
  );
};

export default FormattedDatasetEntryInput;
