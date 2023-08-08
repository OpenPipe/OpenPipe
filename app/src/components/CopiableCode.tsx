import { HStack, Icon, IconButton, Tooltip, Text } from "@chakra-ui/react";
import { useState } from "react";
import { MdContentCopy } from "react-icons/md";
import { useHandledAsyncCallback } from "~/utils/hooks";

const CopiableCode = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const [copyToClipboard] = useHandledAsyncCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }, [code]);
  return (
    <HStack
      backgroundColor="blackAlpha.800"
      color="white"
      borderRadius={4}
      padding={3}
      w="full"
      justifyContent="space-between"
    >
      <Text fontFamily="inconsolata" fontWeight="bold" letterSpacing={0.5}>
        {code}
      </Text>
      <Tooltip closeOnClick={false} label={copied ? "Copied!" : "Copy to clipboard"}>
        <IconButton
          aria-label="Copy"
          icon={<Icon as={MdContentCopy} boxSize={5} />}
          size="xs"
          colorScheme="white"
          variant="ghost"
          onClick={copyToClipboard}
          onMouseLeave={() => setCopied(false)}
        />
      </Tooltip>
    </HStack>
  );
};

export default CopiableCode;
