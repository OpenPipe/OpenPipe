import { Box, Button, HStack, Tooltip, useToast } from "@chakra-ui/react";
import { useMonaco } from "@monaco-editor/react";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useHandledAsyncCallback, useModifierKeyLabel } from "~/utils/hooks";
import { PromptVariant } from "./types";
import { JSONSerializable } from "~/server/types";
import { api } from "~/utils/api";

let isThemeDefined = false;

export default function VariantConfigEditor(props: { variant: PromptVariant }) {
  const monaco = useMonaco();
  const editorRef = useRef<ReturnType<NonNullable<typeof monaco>["editor"]["create"]> | null>(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);

  const savedConfig = useMemo(
    () => JSON.stringify(props.variant.config, null, 2),
    [props.variant.config]
  );
  const savedConfigRef = useRef(savedConfig);

  const modifierKey = useModifierKeyLabel();

  const checkForChanges = useCallback(() => {
    if (!editorRef.current) return;
    const currentConfig = editorRef.current.getValue();
    setIsChanged(currentConfig !== savedConfigRef.current);
  }, []);

  const replaceWithConfig = api.promptVariants.replaceWithConfig.useMutation();
  const utils = api.useContext();
  const toast = useToast();

  const [onSave] = useHandledAsyncCallback(async () => {
    const currentConfig = editorRef.current?.getValue();
    if (!currentConfig) return;

    let parsedConfig: JSONSerializable;
    try {
      parsedConfig = JSON.parse(currentConfig) as JSONSerializable;
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Please fix the JSON before saving.",
        status: "error",
      });
      return;
    }

    if (parsedConfig === null) {
      toast({
        title: "Invalid JSON",
        description: "Please fix the JSON before saving.",
        status: "error",
      });
      return;
    }

    await replaceWithConfig.mutateAsync({
      id: props.variant.id,
      config: currentConfig,
    });

    await utils.promptVariants.list.invalidate();

    checkForChanges();
  }, [checkForChanges]);

  useEffect(() => {
    if (monaco) {
      if (!isThemeDefined) {
        monaco.editor.defineTheme("customTheme", {
          base: "vs",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": "#fafafa",
          },
        });
        isThemeDefined = true;
      }

      const container = document.getElementById(editorId) as HTMLElement;

      editorRef.current = monaco.editor.create(container, {
        value: savedConfig,
        language: "json",
        theme: "customTheme",
        lineNumbers: "off",
        minimap: { enabled: false },
        wrappingIndent: "indent",
        wrappingStrategy: "advanced",
        wordWrap: "on",
        folding: false,
        scrollbar: {
          vertical: "hidden",
          alwaysConsumeMouseWheel: false,
          verticalScrollbarSize: 0,

          // Don't let you scroll to an empty line
        },
        wordWrapBreakAfterCharacters: "",
        wordWrapBreakBeforeCharacters: "",
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
    const savedConfigChanged = savedConfigRef.current !== savedConfig;

    savedConfigRef.current = savedConfig;

    if (savedConfigChanged && editorRef.current?.getValue() !== savedConfig) {
      editorRef.current?.setValue(savedConfig);
    }

    checkForChanges();
  }, [savedConfig, checkForChanges]);

  return (
    <Box w="100%" pos="relative">
      <div id={editorId} style={{ height: "300px", width: "100%" }}></div>
      {isChanged && (
        <HStack pos="absolute" bottom={0} right={0}>
          <Button
            colorScheme="gray"
            size="sm"
            onClick={() => {
              editorRef.current?.setValue(savedConfig);
              checkForChanges();
            }}
            borderRadius={0}
          >
            Reset
          </Button>
          <Tooltip label={`${modifierKey} + Enter`}>
            <Button size="sm" onClick={onSave} colorScheme="blue" borderRadius={0}>
              Save
            </Button>
          </Tooltip>
        </HStack>
      )}
    </Box>
  );
}
