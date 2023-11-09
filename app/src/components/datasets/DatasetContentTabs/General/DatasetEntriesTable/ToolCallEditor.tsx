import { useRef, useMemo, useEffect, useLayoutEffect, useState } from "react";
import { VStack, HStack, Text, Input, Box, Tooltip, IconButton, Icon } from "@chakra-ui/react";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat";
import { BsX } from "react-icons/bs";

import { useAppStore } from "~/state/store";
import { type CreatedEditor } from "~/state/sharedVariantEditor.slice";

const ToolCallEditor = ({
  tool_call,
  onEdit,
  onDelete,
}: {
  tool_call: ChatCompletionMessageToolCall;
  onEdit: (tool_call: ChatCompletionMessageToolCall) => void;
  onDelete: () => void;
}) => {
  const monaco = useAppStore.use.sharedArgumentsEditor.monaco();
  const editorRef = useRef<CreatedEditor | null>(null);
  const editorId = useMemo(() => `editor_${Math.random().toString(36).substring(7)}`, []);

  const { function: function_call } = tool_call;

  const [editor, setEditor] = useState<CreatedEditor | null>(null);

  useLayoutEffect(() => {
    const container = document.getElementById(editorId) as HTMLElement;

    let newEditor: CreatedEditor | null = null;
    if (container && monaco) {
      newEditor = monaco.editor.create(container, {
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

      setEditor(newEditor);
    }
    return () => {
      if (newEditor) newEditor.dispose();
    };
  }, [!!monaco, editorId]);

  useEffect(() => {
    if (editor) {
      const container = document.getElementById(editorId) as HTMLElement;

      editor.setValue(function_call.arguments);

      editorRef.current = editor;

      const updateHeight = () => {
        const contentHeight = editor.getContentHeight();
        container.style.height = `${contentHeight}px`;
        editor.layout();
      };

      const attemptDocumentFormat = () => {
        const action = editor.getAction("editor.action.formatDocument");
        if (action) {
          action
            .run()
            .then(updateHeight)
            .catch((error) => {
              console.error("Error running formatDocument:", error);
            });
          return true;
        }
        return false;
      };

      editor.onDidBlurEditorText(() => {
        attemptDocumentFormat();
        onEdit({
          ...tool_call,
          function: { name: function_call.name, arguments: editor.getValue() },
        });
      });

      // Interval function to check for action availability
      const checkForActionInterval = setInterval(() => {
        const formatted = attemptDocumentFormat();
        if (formatted) {
          clearInterval(checkForActionInterval); // Clear the interval once the action is found and run
        }
      }, 100); // Check every 100ms

      // Add content change listener
      const contentChangeListener = editor.onDidChangeModelContent(updateHeight);

      const resizeObserver = new ResizeObserver(() => {
        editor.layout();
      });
      resizeObserver.observe(container);

      return () => {
        contentChangeListener.dispose();
        resizeObserver.disconnect();
      };
    }
  }, [editor, editorId, function_call.name, function_call.arguments, tool_call, onEdit]);

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
        <Box id={editorId} w="full" />
      </VStack>
    </VStack>
  );
};

export default ToolCallEditor;
