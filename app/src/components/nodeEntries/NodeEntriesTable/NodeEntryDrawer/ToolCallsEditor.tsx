import { Button, HStack, VStack, Text, Icon } from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat";
import { BsPlus } from "react-icons/bs";

import ToolCallEditor from "./ToolCallEditor";

const ToolCallsEditor = ({
  tool_calls,
  onEdit,
}: {
  tool_calls: ChatCompletionMessageToolCall[];
  onEdit: (tool_calls: ChatCompletionMessageToolCall[]) => void;
}) => {
  return (
    <VStack w="full" alignItems="flex-start" spacing={4} p={4} mt={2}>
      {tool_calls.map((tool_call, i) => (
        <ToolCallEditor
          key={i}
          tool_call={tool_call}
          onEdit={(updatedToolCall) => {
            const newToolCalls = [...tool_calls];
            newToolCalls[i] = updatedToolCall;
            onEdit(newToolCalls);
          }}
          onDelete={() => {
            const newToolCalls = [...tool_calls];
            newToolCalls.splice(i, 1);
            onEdit(newToolCalls);
          }}
        />
      ))}
      <Button
        mt={4}
        w="full"
        onClick={() =>
          onEdit([
            ...tool_calls,
            {
              type: "function",
              function: {
                name: "untitled",
                arguments: "{}",
              },
              id: "",
            },
          ])
        }
        variant="outline"
        color="gray.500"
      >
        <HStack spacing={0}>
          <Text>Add Tool Call</Text>
          <Icon as={BsPlus} boxSize={6} />
        </HStack>
      </Button>
    </VStack>
  );
};

export default ToolCallsEditor;
