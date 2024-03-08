import React, { Fragment, useState } from "react";
import { VStack, HStack, Button, Text, Divider, Icon, Collapse } from "@chakra-ui/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { BsPlus } from "react-icons/bs";

import EditableMessage from "./EditableMessage";
import { type RouterOutputs } from "~/utils/api";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const InputEditor = ({
  inputMessagesToSave,
  setInputMessagesToSave,
  matchedRules,
}: {
  inputMessagesToSave: ChatCompletionMessageParam[];
  setInputMessagesToSave: (inputMessagesToSave: ChatCompletionMessageParam[]) => void;
  matchedRules?: RouterOutputs["nodeEntries"]["get"]["matchedRules"];
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
          Input Messages
        </Text>
        <Button variant="ghost" color="gray.500" onClick={() => setExpanded(!expanded)}>
          <HStack spacing={1}>
            <Text>{expanded ? "Hide" : "Show"}</Text>
            <Icon as={expanded ? FiChevronUp : FiChevronDown} boxSize={5} mt={0.5} />
          </HStack>
        </Button>
      </HStack>
      <Collapse
        style={{
          width: "100%",
          paddingRight: 1,
          paddingLeft: 1,
        }}
        in={expanded}
        unmountOnExit={true}
      >
        <VStack w="full" alignItems="flex-start" spacing={0}>
          {inputMessagesToSave.map((message, i) => {
            return (
              <Fragment key={i}>
                <Divider my={4} />
                <EditableMessage
                  message={message}
                  onEdit={(message) => {
                    const newInputMessages = [...inputMessagesToSave];
                    newInputMessages[i] = message;
                    setInputMessagesToSave(newInputMessages);
                  }}
                  onDelete={() => {
                    const newInputMessages = [...inputMessagesToSave];
                    newInputMessages.splice(i, 1);
                    setInputMessagesToSave(newInputMessages);
                  }}
                  ruleMatches={matchedRules}
                />
              </Fragment>
            );
          })}
          <Divider my={4} />
          <Button
            w="full"
            onClick={() =>
              setInputMessagesToSave([...inputMessagesToSave, { role: "user", content: "" }])
            }
            variant="outline"
            color="gray.500"
          >
            <HStack spacing={0}>
              <Text>Add Message</Text>
              <Icon as={BsPlus} boxSize={6} />
            </HStack>
          </Button>
        </VStack>
      </Collapse>
    </VStack>
  );
};

export default InputEditor;
