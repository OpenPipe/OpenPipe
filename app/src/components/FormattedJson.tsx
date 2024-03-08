import { Box, type BoxProps, Button } from "@chakra-ui/react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atelierCaveLight } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import stringify from "json-stringify-pretty-compact";

import { useCopyToClipboard } from "~/utils/useCopyToClipboard";

const FormattedJson = ({
  json,
  copiable = true,
  ...rest
}: { json: any; copiable?: boolean } & BoxProps) => {
  const jsonString = stringify(json, { maxLength: 40 });
  const copyToClipboard = useCopyToClipboard();

  return (
    <Box
      position="relative"
      fontSize="sm"
      borderRadius="md"
      overflow="hidden"
      borderWidth={1}
      borderColor="gray.300"
      bgColor="gray.50"
      w="full"
      {...rest}
    >
      <SyntaxHighlighter
        customStyle={{
          overflowX: "unset",
          backgroundColor: "transparent",
          padding: 16,
        }}
        language="json"
        style={atelierCaveLight}
        lineProps={{
          style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
        }}
        wrapLines
      >
        {/* convert non-breaking spaces into regular spaces */}
        {jsonString.replace(/[\u00A0]+/g, " ")}
      </SyntaxHighlighter>
      {copiable && (
        <Button
          variant="ghost"
          position="absolute"
          top={1.5}
          right={1.5}
          colorScheme="orange"
          _hover={{ bgColor: "gray.100" }}
          fontSize="xs"
          onClick={() => void copyToClipboard(jsonString)}
        >
          COPY
        </Button>
      )}
    </Box>
  );
};

export { FormattedJson };
