import { HStack, VStack } from "@chakra-ui/react";
import React from "react";
import DiffViewer, { DiffMethod } from "react-diff-viewer";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css"; // choose a theme you like

const CompareFunctions = ({
  originalFunction,
  newFunction = "",
}: {
  originalFunction: string;
  newFunction?: string;
}) => {
  console.log("newFunction", newFunction);
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
  return (
    <HStack w="full" spacing={5}>
      <VStack w="full" spacing={4} maxH="70vh" fontSize={12} lineHeight={1}>
        <DiffViewer
          oldValue={originalFunction}
          newValue={newFunction || originalFunction}
          splitView={true}
          hideLineNumbers={true}
          leftTitle="Original"
          rightTitle={newFunction ? "Modified" : "Unmodified"}
          disableWordDiff={true}
          compareMethod={DiffMethod.CHARS}
          renderContent={highlightSyntax}
        />
      </VStack>
    </HStack>
  );
};

export default CompareFunctions;
