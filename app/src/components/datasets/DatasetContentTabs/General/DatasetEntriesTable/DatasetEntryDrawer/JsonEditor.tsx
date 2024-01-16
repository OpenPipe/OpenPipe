import { useRef, useMemo, useEffect, useLayoutEffect, useState } from "react";
import { VStack, Box } from "@chakra-ui/react";

import { useAppStore } from "~/state/store";
import { type CreatedEditor } from "~/state/sharedArgumentsEditor.slice";

const JsonEditor = ({ value, onEdit }: { value: string; onEdit: (newValue: string) => void }) => {
  const monaco = useAppStore.use.sharedArgumentsEditor.monaco();
  const editorRef = useRef<CreatedEditor | null>(null);
  const editorId = useMemo(() => `editor_${Math.random().toString(36).substring(7)}`, []);

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

      editor.setValue(value);

      editorRef.current = editor;

      const updateHeight = () => {
        container.style.height = `${editor.getContentHeight()}px`;
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
        onEdit(editor.getValue());

        attemptDocumentFormat();
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
  }, [editor, editorId, value, onEdit]);

  return (
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
  );
};

export default JsonEditor;
