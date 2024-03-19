import React, { useState } from "react";
import { VStack, HStack, Button, Text, Divider, Icon, Collapse } from "@chakra-ui/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import EditableMessage from "./EditableMessage";

const OutputEditor = ({
  outputMessageToSave,
  setOutputMessageToSave,
}: {
  outputMessageToSave: ChatCompletionMessageParam | null;
  setOutputMessageToSave: (message: ChatCompletionMessageParam | null) => void;
}) => {
  const [expanded, setExpanded] = useState(true);

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
          Output
        </Text>
        <Button variant="ghost" color="gray.500" onClick={() => setExpanded(!expanded)}>
          <HStack spacing={1}>
            <Text>{expanded ? "Hide" : "Show"}</Text>
            <Icon as={expanded ? FiChevronUp : FiChevronDown} boxSize={5} mt={0.5} />
          </HStack>
        </Button>
      </HStack>
      <Collapse style={{ width: "100%", padding: 1 }} in={expanded} unmountOnExit={true}>
        <Divider my={4} />
        <EditableMessage
          message={outputMessageToSave}
          onEdit={(message) => setOutputMessageToSave(message)}
          isOutput
        />
      </Collapse>
    </VStack>
  );
};

export default OutputEditor;
