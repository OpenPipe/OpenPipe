import {
  Box,
  Button,
  HStack,
  IconButton,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { type CreatedEditor, editorBackground } from "~/state/sharedVariantEditor.slice";
import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import {
  useExperimentAccess,
  useHandledAsyncCallback,
  useModifierKeyLabel,
  useVisibleScenarioIds,
} from "~/utils/hooks";
import { type PromptVariant } from "./types";

export default function VariantEditor(props: { variant: PromptVariant }) {
  const { canModify } = useExperimentAccess();
  const monaco = useAppStore.use.sharedVariantEditor.monaco();
  const updateOptionsForEditor = useAppStore.use.sharedVariantEditor.updateOptionsForEditor();
  const editorRef = useRef<CreatedEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSavedFnRef = useRef(props.variant.promptConstructor);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    editorRef.current?.focus();
  }, [setIsFullscreen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen, toggleFullscreen]);

  const lastSavedFn = props.variant.promptConstructor;
  useEffect(() => {
    // Store in ref so that we can access it dynamically
    lastSavedFnRef.current = lastSavedFn;
  }, [lastSavedFn]);

  const modifierKey = useModifierKeyLabel();

  const checkForChanges = useCallback(() => {
    if (!editorRef.current) return;
    const currentFn = editorRef.current.getValue();
    setIsChanged(currentFn.length > 0 && currentFn !== lastSavedFnRef.current);
  }, [editorRef]);

  const replaceVariant = api.promptVariants.replaceVariant.useMutation();
  const utils = api.useContext();
  const toast = useToast();
  const visibleScenarios = useVisibleScenarioIds();

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
      promptConstructor: currentFn,
      streamScenarios: visibleScenarios,
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
  }, [checkForChanges, replaceVariant.mutateAsync]);

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

      updateOptionsForEditor(props.variant.uiId, {
        getContent: () => editorRef.current?.getValue() || "",
        setContent: (content) => editorRef.current?.setValue(content),
      });

      // Workaround because otherwise the commands only work on whatever
      // editor was loaded on the page last.
      // https://github.com/microsoft/monaco-editor/issues/2947#issuecomment-1422265201
      editorRef.current.onDidFocusEditorText(() => {
        editorRef.current?.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);

        editorRef.current?.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
          toggleFullscreen,
        );

        // Exit fullscreen with escape
        editorRef.current?.addCommand(monaco.KeyCode.Escape, () => {
          if (isFullscreen) {
            toggleFullscreen();
          }
        });
      });

      const checkForChangesListener = editorRef.current.onDidChangeModelContent(checkForChanges);

      const resizeObserver = new ResizeObserver(() => {
        editorRef.current?.layout();
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        checkForChangesListener.dispose();
        editorRef.current?.dispose();
      };
    }

    // We intentionally skip the onSave and props.savedConfig dependencies here because
    // we don't want to re-render the editor from scratch
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [monaco, editorId, updateOptionsForEditor]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      readOnly: !canModify,
    });
  }, [canModify]);

  return (
    <Box
      w="100%"
      ref={containerRef}
      sx={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }
          : { h: "400px", w: "100%" }
      }
      bgColor={editorBackground}
      zIndex={isFullscreen ? 1000 : "unset"}
      pos="relative"
      _hover={{ ".fullscreen-toggle": { opacity: 1 } }}
    >
      <Box id={editorId} w="100%" h="100%" />
      <Tooltip label={`${modifierKey} + ⇧ + F`}>
        <IconButton
          className="fullscreen-toggle"
          aria-label="Minimize"
          icon={isFullscreen ? <FiMinimize /> : <FiMaximize />}
          position="absolute"
          top={2}
          right={2}
          onClick={toggleFullscreen}
          opacity={0}
          transition="opacity 0.2s"
        />
      </Tooltip>

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
          <Tooltip label={`${modifierKey} + S`}>
            <Button size="sm" onClick={onSave} colorScheme="blue" w={16} disabled={saveInProgress}>
              {saveInProgress ? <Spinner boxSize={4} /> : <Text>Save</Text>}
            </Button>
          </Tooltip>
        </HStack>
      )}
    </Box>
  );
}
