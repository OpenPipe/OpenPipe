import { useState } from "react";
import { HStack, VStack, Icon, Text, Link } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import JsonEditor from "./JsonEditor";

const ToolsEditor = ({ value, onEdit }: { value: string; onEdit: (newValue: string) => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <VStack w="full" alignItems="flex-start">
      <HStack w="full" cursor="pointer" onClick={() => setExpanded(!expanded)}>
        <Text fontWeight="bold" fontSize="xl">
          Tools
        </Text>
        <Icon as={expanded ? FiChevronUp : FiChevronDown} />
      </HStack>
      {expanded && (
        <>
          <JsonEditor value={value} onEdit={onEdit} />
          <Link
            href="https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools"
            target="_blank"
            color="blue.500"
            _hover={{ color: "blue.800", textDecoration: "underline" }}
          >
            Learn more
          </Link>
        </>
      )}
    </VStack>
  );
};

export default ToolsEditor;
