import { VStack, HStack, Text, Input, Tooltip, IconButton, Icon } from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat";
import { BsX } from "react-icons/bs";

import JsonEditor from "./JsonEditor";

const ToolCallEditor = ({
  tool_call,
  onEdit,
  onDelete,
}: {
  tool_call: ChatCompletionMessageToolCall;
  onEdit: (tool_call: ChatCompletionMessageToolCall) => void;
  onDelete: () => void;
}) => {
  const { function: function_call } = tool_call;

  return (
    <VStack
      w="full"
      alignItems="flex-start"
      bgColor="orange.100"
      borderRadius={8}
      borderWidth={1}
      p={4}
    >
      <HStack w="full">
        <Text fontWeight="bold" w={192}>
          Name
        </Text>
        <Input
          value={function_call.name}
          onChange={(e) =>
            onEdit({
              ...tool_call,
              function: { name: e.target.value, arguments: function_call.arguments },
            })
          }
          bgColor="white"
        />
        <Tooltip label="Remove Tool Call" hasArrow>
          <IconButton
            aria-label="Remove Tool Call"
            icon={<Icon as={BsX} boxSize={6} />}
            onClick={onDelete}
            size="xs"
            display="flex"
            colorScheme="gray"
            color="gray.500"
            variant="ghost"
          />
        </Tooltip>
      </HStack>
      <Text fontWeight="bold" w={32}>
        Arguments
      </Text>
      <VStack
        borderRadius={4}
        border="1px solid"
        borderColor="gray.200"
        w="full"
        py={1}
        bgColor="white"
      >
        <JsonEditor
          value={function_call.arguments}
          onEdit={(newValue) =>
            onEdit({
              ...tool_call,
              function: { name: function_call.name, arguments: newValue },
            })
          }
        />
      </VStack>
    </VStack>
  );
};

export default ToolCallEditor;
