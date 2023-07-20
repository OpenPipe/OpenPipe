import { HStack, VStack, useBreakpointValue } from "@chakra-ui/react";
import React from "react";
import DiffViewer, { DiffMethod } from "react-diff-viewer";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css"; // choose a theme you like

const highlightSyntax = (str: string) => {
  let highlighted;
  try {
    highlighted = Prism.highlight(str, Prism.languages.javascript as Prism.Grammar, "javascript");
  } catch (e) {
    console.error("Error highlighting:", e);
    highlighted = str;
  }
  return <pre style={{ display: "inline" }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

const CompareFunctions = ({
  originalFunction,
  newFunction = "",
}: {
  originalFunction: string;
  newFunction?: string;
}) => {
  const showSplitView = useBreakpointValue(
    {
      base: false,
      md: true,
    },
    {
      fallback: "base",
    },
  );

  return (
    <HStack w="full" spacing={5}>
      <VStack w="full" spacing={4} maxH="40vh" fontSize={12} lineHeight={1} overflowY="auto">
        <DiffViewer
          oldValue={originalFunction}
          newValue={newFunction || originalFunction}
          splitView={showSplitView}
          hideLineNumbers={!showSplitView}
          leftTitle="Original"
          rightTitle={newFunction ? "Modified" : "Unmodified"}
          disableWordDiff={true}
          compareMethod={DiffMethod.CHARS}
          renderContent={highlightSyntax}
          showDiffOnly={false}
        />
      </VStack>
    </HStack>
  );
};

export default CompareFunctions;
