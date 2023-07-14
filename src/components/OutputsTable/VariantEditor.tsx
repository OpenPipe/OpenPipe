import { Box, Button, HStack, Tooltip, useToast } from "@chakra-ui/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useHandledAsyncCallback, useModifierKeyLabel } from "~/utils/hooks";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
// import openAITypes from "~/codegen/openai.types.ts.txt";

export default function VariantConfigEditor(props: { variant: PromptVariant }) {
  const monaco = useAppStore.use.sharedVariantEditor.monaco();
  const editorRef = useRef<ReturnType<NonNullable<typeof monaco>["editor"]["create"]> | null>(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);

  const lastSavedFn = props.variant.constructFn;

  const modifierKey = useModifierKeyLabel();

  const checkForChanges = useCallback(() => {
    if (!editorRef.current) return;
    const currentConfig = editorRef.current.getValue();
    setIsChanged(currentConfig !== lastSavedFn);
  }, [lastSavedFn]);

  const replaceVariant = api.promptVariants.replaceVariant.useMutation();
  const utils = api.useContext();
  const toast = useToast();

  const [onSave] = useHandledAsyncCallback(async () => {
    const currentFn = editorRef.current?.getValue();
    if (!currentFn) return;

    // Check if the editor has any typescript errors
    const model = editorRef.current?.getModel();
    if (!model) return;

    const markers = monaco?.editor.getModelMarkers({ resource: model.uri });
    const hasErrors = markers?.some((m) => m.severity === monaco?.MarkerSeverity.Error);

    if (hasErrors) {
      toast({
        title: "Invalid TypeScript",
        description: "Please fix the TypeScript errors before saving.",
        status: "error",
      });
      return;
    }

    // Make sure the user defined the prompt with the string "prompt\w*=" somewhere
    const promptRegex = /prompt\s*=/;
    if (!promptRegex.test(currentFn)) {
      console.log("no prompt");
      console.log(currentFn);
      toast({
        title: "Missing prompt",
        description: "Please define the prompt (eg. `prompt = { ...`).",
        status: "error",
      });
      return;
    }

    await replaceVariant.mutateAsync({
      id: props.variant.id,
      constructFn: currentFn,
    });

    await utils.promptVariants.list.invalidate();

    checkForChanges();
  }, [checkForChanges]);

  useEffect(() => {
    if (monaco) {
      const container = document.getElementById(editorId) as HTMLElement;

      editorRef.current = monaco.editor.create(container, {
        value: lastSavedFn,
        language: "typescript",
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
      });

      editorRef.current.onDidFocusEditorText(() => {
        // Workaround because otherwise the command only works on whatever
        // editor was loaded on the page last.
        // https://github.com/microsoft/monaco-editor/issues/2947#issuecomment-1422265201
        editorRef.current?.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onSave);
      });

      editorRef.current.onDidChangeModelContent(checkForChanges);

      const resizeObserver = new ResizeObserver(() => {
        editorRef.current?.layout();
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        editorRef.current?.dispose();
      };
    }

    // We intentionally skip the onSave and props.savedConfig dependencies here because
    // we don't want to re-render the editor from scratch
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [monaco, editorId]);

  // useEffect(() => {
  //   const savedConfigChanged = lastSavedFn !== savedConfig;

  //   lastSavedFn = savedConfig;

  //   if (savedConfigChanged && editorRef.current?.getValue() !== savedConfig) {
  //     editorRef.current?.setValue(savedConfig);
  //   }

  //   checkForChanges();
  // }, [savedConfig, checkForChanges]);

  return (
    <Box w="100%" pos="relative">
      <div id={editorId} style={{ height: "300px", width: "100%" }}></div>
      {isChanged && (
        <HStack pos="absolute" bottom={2} right={2}>
          <Button
            colorScheme="gray"
            size="sm"
            onClick={() => {
              editorRef.current?.setValue(lastSavedFn);
              checkForChanges();
            }}
          >
            Reset
          </Button>
          <Tooltip label={`${modifierKey} + Enter`}>
            <Button size="sm" onClick={onSave} colorScheme="blue">
              Save
            </Button>
          </Tooltip>
        </HStack>
      )}
    </Box>
  );
}
