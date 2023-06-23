import { Box, Button, Stack, Title } from "@mantine/core";
import { useMonaco } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import { set } from "zod";
import { useHandledAsyncCallback } from "~/utils/hooks";

let isThemeDefined = false;

export default function VariantConfigEditor(props: {
  initialConfig: string;
  onSave: (currentConfig: string) => Promise<void>;
}) {
  const monaco = useMonaco();
  const editorRef = useRef<ReturnType<NonNullable<typeof monaco>["editor"]["create"]> | null>(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);
  const [isChanged, setIsChanged] = useState(false);

  const [onSave] = useHandledAsyncCallback(async () => {
    const currentConfig = editorRef.current?.getValue();
    if (!currentConfig) return;
    await props.onSave(currentConfig);
  }, [props.onSave]);

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

      editorRef.current = monaco.editor.create(document.getElementById(editorId) as HTMLElement, {
        value: props.initialConfig,
        language: "json",
        theme: "customTheme",
        lineNumbers: "off",
        minimap: { enabled: false },
        wrappingIndent: "indent",
        wrappingStrategy: "advanced",
        wordWrap: "on",
        folding: false,
        scrollbar: { vertical: "hidden", alwaysConsumeMouseWheel: false },
        wordWrapBreakAfterCharacters: "",
        wordWrapBreakBeforeCharacters: "",
      });

      editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onSave);

      editorRef.current.onDidChangeModelContent(() => {
        const currentConfig = editorRef.current?.getValue();
        if (currentConfig !== props.initialConfig) {
          setIsChanged(true);
        } else {
          setIsChanged(false);
        }
      });

      return () => editorRef.current?.dispose();
    }
  }, [monaco, editorId, props.initialConfig, onSave]);

  return (
    <Box w="100%" pos="relative">
      <div id={editorId} style={{ height: "300px", width: "100%" }}></div>
      {isChanged && (
        <Button size="xs" sx={{ position: "absolute", bottom: 0, right: 0 }} onClick={onSave}>
          Save
        </Button>
      )}
    </Box>
  );
}
