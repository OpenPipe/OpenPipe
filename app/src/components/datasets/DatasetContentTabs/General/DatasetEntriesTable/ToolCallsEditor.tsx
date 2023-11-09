import { VStack } from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat";
import ToolCallEditor from "./ToolCallEditor";

const ToolCallsEditor = ({
  tool_calls,
  onEdit,
}: {
  tool_calls: ChatCompletionMessageToolCall[];
  onEdit: (tool_calls: ChatCompletionMessageToolCall[]) => void;
}) => {
  return (
    <VStack w="full" alignItems="flex-start">
      {tool_calls.map((tool_call, i) => (
        <ToolCallEditor
          key={i}
          tool_call={tool_call}
          onEdit={(updatedToolCall) => {
            const newToolCalls = [...tool_calls];
            newToolCalls[i] = updatedToolCall;
            onEdit(newToolCalls);
          }}
        />
      ))}
    </VStack>
  );
};

export default ToolCallsEditor;
