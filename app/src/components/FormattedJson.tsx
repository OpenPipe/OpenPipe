import { Box, IconButton, useToast } from "@chakra-ui/react";
import { CopyIcon } from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atelierCaveLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";

const FormattedJson = ({ json }: { json: any }) => {
  const jsonString = stringify(json, { maxLength: 40 });
  const toast = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy to clipboard",
        status: "error",
        duration: 2000,
      });
    }
  };

  return (
    <Box position="relative" fontSize="sm" borderRadius="md" overflow="hidden">
      <SyntaxHighlighter
        customStyle={{ overflowX: "unset" }}
        language="json"
        style={atelierCaveLight}
        lineProps={{
          style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
        }}
        wrapLines
      >
        {jsonString}
      </SyntaxHighlighter>
      <IconButton
        aria-label="Copy"
        icon={<CopyIcon />}
        position="absolute"
        top={1}
        right={1}
        size="xs"
        variant="ghost"
        onClick={() => void copyToClipboard(jsonString)}
      />
    </Box>
  );
};

export { FormattedJson };
