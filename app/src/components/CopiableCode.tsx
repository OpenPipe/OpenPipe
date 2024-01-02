import { HStack, Icon, IconButton, Tooltip, Text, type StackProps } from "@chakra-ui/react";
import { useState } from "react";
import { MdContentCopy } from "react-icons/md";
import { useHandledAsyncCallback } from "~/utils/hooks";

const CopiableCode = ({
  code,
  isDisabled,
  ...rest
}: { code: string; isDisabled?: boolean } & StackProps) => {
  const [copied, setCopied] = useState(false);

  const [copyToClipboard] = useHandledAsyncCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }, [code]);

  let tooltipLabel = copied ? "Copied!" : "Copy to clipboard";
  if (isDisabled) {
    tooltipLabel = "Copying Disabled";
  }

  return (
    <HStack
      backgroundColor="blackAlpha.800"
      color="white"
      borderRadius={4}
      padding={3}
      w="full"
      justifyContent="space-between"
      alignItems="flex-start"
      {...rest}
    >
      <Text
        fontFamily="inconsolata"
        fontWeight="bold"
        letterSpacing={0.5}
        overflowX="auto"
        whiteSpace="pre-wrap"
      >
        {code}
        {/* Necessary for trailing newline to actually be displayed */}
        {code.endsWith("\n") ? "\n" : ""}
      </Text>
      <Tooltip closeOnClick={false} label={tooltipLabel}>
        <IconButton
          aria-label="Copy"
          icon={<Icon as={MdContentCopy} boxSize={5} />}
          size="xs"
          colorScheme="white"
          variant="ghost"
          onClick={copyToClipboard}
          onMouseLeave={() => setCopied(false)}
          isDisabled={isDisabled}
        />
      </Tooltip>
    </HStack>
  );
};

export default CopiableCode;
