import { Box, Button, Group, Stack, Title, Tooltip } from "@mantine/core";
import { useMonaco } from "@monaco-editor/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { set } from "zod";
import { useHandledAsyncCallback, useModifierKeyLabel } from "~/utils/hooks";

let isThemeDefined = false;

export default function VariantConfigEditor(props: {
  savedConfig: string;
  onSave: (currentConfig: string) => Promise<void>;
}) {
  const monaco = useMonaco();
  const editorRef = useRef<ReturnType<NonNullable<typeof monaco>["editor"]["create"]> | null>(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);
  const savedConfigRef = useRef(props.savedConfig);

  const modifierKey = useModifierKeyLabel();

  const checkForChanges = useCallback(() => {
    if (!editorRef.current) return;
    const currentConfig = editorRef.current.getValue();
    setIsChanged(currentConfig !== savedConfigRef.current);
  }, []);

  const [onSave] = useHandledAsyncCallback(async () => {
    const currentConfig = editorRef.current?.getValue();
    if (!currentConfig) return;
    await props.onSave(currentConfig);
    checkForChanges();
  }, [props.onSave, checkForChanges]);

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
        value: props.savedConfig,
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
    const savedConfigChanged = savedConfigRef.current !== props.savedConfig;

    savedConfigRef.current = props.savedConfig;

    if (savedConfigChanged && editorRef.current?.getValue() !== props.savedConfig) {
      editorRef.current?.setValue(props.savedConfig);
    }

    checkForChanges();
  }, [props.savedConfig, checkForChanges]);

  return (
    <Box w="100%" pos="relative">
      <div id={editorId} style={{ height: "300px", width: "100%" }}></div>
      {isChanged && (
        <Group sx={{ position: "absolute", bottom: 0, right: 0 }} spacing={4}>
          <Button
            size="xs"
            onClick={() => {
              editorRef.current?.setValue(props.savedConfig);
              checkForChanges();
            }}
            color="gray"
          >
            Reset
          </Button>
          <Tooltip label={`${modifierKey} + Enter`} withArrow>
            <Button size="xs" onClick={onSave}>
              Save
            </Button>
          </Tooltip>
        </Group>
      )}
    </Box>
  );
}
