import { Box, Button, HStack, Spinner, Tooltip, useToast, Text } from "@chakra-ui/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { useExperimentAccess, useHandledAsyncCallback, useModifierKeyLabel } from "~/utils/hooks";
import { type PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";

export default function VariantEditor(props: { variant: PromptVariant }) {
  const { canModify } = useExperimentAccess();
  const monaco = useAppStore.use.sharedVariantEditor.monaco();
  const editorRef = useRef<ReturnType<NonNullable<typeof monaco>["editor"]["create"]> | null>(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);

  const lastSavedFn = props.variant.constructFn;

  const modifierKey = useModifierKeyLabel();

  const checkForChanges = useCallback(() => {
    if (!editorRef.current) return;
    const currentFn = editorRef.current.getValue();
    setIsChanged(currentFn.length > 0 && currentFn !== lastSavedFn);
  }, [lastSavedFn]);

  const matchUpdatedSavedFn = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.setValue(lastSavedFn);
    setIsChanged(false);
  }, [lastSavedFn]);

  useEffect(matchUpdatedSavedFn, [matchUpdatedSavedFn, lastSavedFn]);

  const replaceVariant = api.promptVariants.replaceVariant.useMutation();
  const utils = api.useContext();
  const toast = useToast();

  const [onSave, saveInProgress] = useHandledAsyncCallback(async () => {
    if (!editorRef.current) return;

    await editorRef.current.getAction("editor.action.formatDocument")?.run();

    const currentFn = editorRef.current.getValue();

    if (!currentFn) return;

    // Check if the editor has any typescript errors
    const model = editorRef.current.getModel();
    if (!model) return;

    // Make sure the user defined the prompt with the string "prompt\w*=" somewhere
    const promptRegex = /definePrompt\(/;
    if (!promptRegex.test(currentFn)) {
      toast({
        title: "Missing prompt",
        description: "Please define the prompt (eg. `definePrompt(...`",
        status: "error",
      });
      return;
    }

    const resp = await replaceVariant.mutateAsync({
      id: props.variant.id,
      constructFn: currentFn,
    });
    if (resp.status === "error") {
      return toast({
        title: "Error saving variant",
        description: resp.message,
        status: "error",
      });
    }

    setIsChanged(false);

    await utils.promptVariants.list.invalidate();
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
        readOnly: !canModify,
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

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      readOnly: !canModify,
    });
  }, [canModify]);

  return (
    <Box w="100%" pos="relative">
      <div id={editorId} style={{ height: "400px", width: "100%" }}></div>
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
            <Button size="sm" onClick={onSave} colorScheme="blue" w={16} disabled={saveInProgress}>
              {saveInProgress ? <Spinner boxSize={4} /> : <Text>Save</Text>}
            </Button>
          </Tooltip>
        </HStack>
      )}
    </Box>
  );
}
