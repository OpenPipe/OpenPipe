import { useState } from "react";
import { HStack, VStack, Icon, Text, Link, Button } from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import JsonEditor from "./JsonEditor";

const ToolsEditor = ({
  toolsToSave,
  setToolsToSave,
}: {
  toolsToSave: string;
  setToolsToSave: (toolsToSave: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <VStack
      w="full"
      alignItems="flex-start"
      spacing={0}
      px={4}
      py={4}
      borderRadius={4}
      borderWidth={1}
      bgColor="gray.50"
      boxShadow="0 0 10px 1px rgba(0, 0, 0, 0.05);"
    >
      <HStack w="full" justifyContent="space-between">
        <Text fontWeight="bold" fontSize="lg">
          Tools
        </Text>
        <Button variant="ghost" color="gray.500" onClick={() => setExpanded(!expanded)}>
          <HStack spacing={1}>
            <Text>{expanded ? "Hide" : "Show"}</Text>
            <Icon as={expanded ? FiChevronUp : FiChevronDown} boxSize={5} mt={0.5} />
          </HStack>
        </Button>
      </HStack>
      {expanded && (
        <VStack w="full" pt={4}>
          <JsonEditor value={toolsToSave} onEdit={setToolsToSave} />
          <Link
            href="https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools"
            target="_blank"
            color="blue.500"
            pt={2}
            alignSelf="flex-end"
            _hover={{ color: "blue.800", textDecoration: "underline" }}
          >
            Learn more
          </Link>
        </VStack>
      )}
    </VStack>
  );
};

export default ToolsEditor;
