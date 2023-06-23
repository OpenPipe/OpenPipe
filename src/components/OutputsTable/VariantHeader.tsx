import { Header, Stack, Title } from "@mantine/core";
import { PromptVariant } from "@prisma/client";
import { useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

let isThemeDefined = false;

export default function VariantHeader({ variant }: { variant: PromptVariant }) {
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const [editorId] = useState(() => `editor_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    if (monaco && !isThemeDefined) {
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
  }, [monaco]);

  useEffect(() => {
    if (monaco) {
      editorRef.current = monaco.editor.create(document.getElementById(editorId), {
        value: JSON.stringify(variant.config, null, 2),
        language: "json",
        theme: "customTheme",
        lineNumbers: "off",
        minimap: { enabled: false },
        wrappingIndent: "indent",
        wrappingStrategy: "advanced",
        wordWrap: "on",
        folding: false,
        scrollbar: { vertical: "hidden" },
        wordWrapBreakAfterCharacters: "",
        wordWrapBreakBeforeCharacters: "",
      });
    }

    // Clean up the editor instance on unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, [monaco, variant, editorId]);

  return (
    <Stack w="100%">
      <Title order={4}>{variant.label}</Title>
      <div id={editorId} style={{ height: "300px", width: "100%" }}></div>
    </Stack>
  );
}
