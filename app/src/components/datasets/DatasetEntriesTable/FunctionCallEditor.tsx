import { useRef, useMemo, useEffect } from "react";
import { VStack, HStack, Text, Input, Box } from "@chakra-ui/react";
import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";

import { useAppStore } from "~/state/store";
import { type CreatedEditor } from "~/state/sharedVariantEditor.slice";

const FunctionCallEditor = ({
  function_call,
  onEdit,
}: {
  function_call: CreateChatCompletionRequestMessage.FunctionCall;
  onEdit: (function_call: CreateChatCompletionRequestMessage.FunctionCall) => void;
}) => {
  const monaco = useAppStore.use.sharedArgumentsEditor.monaco();
  const editorRef = useRef<CreatedEditor | null>(null);
  const editorId = useMemo(() => `editor_${Math.random().toString(36).substring(7)}`, []);

  useEffect(() => {
    if (monaco) {
      const container = document.getElementById(editorId) as HTMLElement;

      const editor = monaco.editor.create(container, {
        value: function_call.arguments,
        language: "json",
        theme: "customTheme",
        lineNumbers: "off",
        minimap: { enabled: false },
        wrappingIndent: "indent",
        wrappingStrategy: "advanced",
        wordWrap: "on",
        folding: false,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          verticalScrollbarSize: 0,
        },
        wordWrapBreakAfterCharacters: "",
        wordWrapBreakBeforeCharacters: "",
        quickSuggestions: true,
        renderLineHighlight: "none",
        fontSize: 14,
        scrollBeyondLastLine: false,
      });

      editorRef.current = editor;

      // Interval function to check for action availability
      const checkForActionInterval = setInterval(() => {
        const action = editor.getAction("editor.action.formatDocument");
        if (action) {
          action.run().catch((error) => {
            console.error("Error running formatDocument:", error);
          });
          clearInterval(checkForActionInterval); // Clear the interval once the action is found and run
        }
      }, 100); // Check every 100ms

      const resizeObserver = new ResizeObserver(() => {
        editor.layout();
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        editor?.dispose();
      };
    }
  }, [monaco, editorId, function_call.arguments]);

  return (
    <VStack w="full" alignItems="flex-start">
      <HStack w="full">
        <Text fontWeight="bold" w={200}>
          Name:
        </Text>
        <Input
          value={function_call.name}
          onChange={(e) => onEdit({ name: e.target.value, arguments: function_call.arguments })}
          bgColor="white"
        />
      </HStack>
      <Text fontWeight="bold" w={32}>
        Arguments
      </Text>
      <Box
        id={editorId}
        borderRadius={4}
        border="1px solid"
        borderColor="gray.200"
        w="full"
        height={100}
        resize="vertical"
        overflow="auto"
      />
    </VStack>
  );
};

export default FunctionCallEditor;
