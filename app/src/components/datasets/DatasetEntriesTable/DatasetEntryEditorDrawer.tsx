import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerFooter,
  Heading,
  VStack,
  HStack,
  Button,
  Text,
} from "@chakra-ui/react";
import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";

import { api } from "~/utils/api";
import { useDatasetEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EditableMessage from "./EditableMessage";

export default function DatasetDentryEditorDrawer({
  datasetEntryId,
  clearDatasetEntryId,
}: {
  datasetEntryId: string | null;
  clearDatasetEntryId: () => void;
}) {
  const utils = api.useContext();

  const datasetEntry = useDatasetEntry(datasetEntryId).data;

  const savedInputMessages = useMemo(
    () => datasetEntry?.input as unknown as CreateChatCompletionRequestMessage[],
    [datasetEntry],
  );
  const savedOutputMessage = useMemo(
    () => datasetEntry?.output as unknown as CreateChatCompletionRequestMessage,
    [datasetEntry],
  );

  const [inputMessagesToSave, setInputMessagesToSave] = useState<
    CreateChatCompletionRequestMessage[]
  >([]);
  const [outputMessageToSave, setOutputMessageToSave] =
    useState<CreateChatCompletionRequestMessage | null>(null);

  useEffect(() => {
    if (savedInputMessages) {
      setInputMessagesToSave(savedInputMessages);
      setOutputMessageToSave(savedOutputMessage);
    }
  }, [savedInputMessages, savedOutputMessage]);

  const updateMutation = api.datasetEntries.update.useMutation();
  const [onSave, savingInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetEntryId || !inputMessagesToSave) return;
    await updateMutation.mutateAsync({
      id: datasetEntryId,
      updates: {
        input: JSON.stringify(inputMessagesToSave),
        output: JSON.stringify(outputMessageToSave),
      },
    });
    await utils.datasetEntries.list.invalidate();
    await utils.datasetEntries.get.invalidate({ id: datasetEntryId });
  }, [updateMutation, datasetEntryId, inputMessagesToSave, outputMessageToSave, utils]);

  return (
    <Drawer isOpen={!!datasetEntryId} onClose={clearDatasetEntryId} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader bgColor="gray.100">
          <Heading size="md">Dataset Entry</Heading>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="gray.100">
          <VStack h="full" justifyContent="space-between">
            <VStack w="full" spacing={12}>
              <VStack w="full" alignItems="flex-start">
                <Text fontWeight="bold">Input:</Text>
                {inputMessagesToSave.map((message, i) => {
                  return (
                    <EditableMessage
                      key={i}
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
                    />
                  );
                })}
              </VStack>
              <VStack w="full" alignItems="flex-start">
                <Text fontWeight="bold">Output:</Text>
                <EditableMessage
                  message={outputMessageToSave}
                  onEdit={(message) => setOutputMessageToSave(message)}
                  isOutput
                />
              </VStack>
            </VStack>
          </VStack>
        </DrawerBody>
        <DrawerFooter bgColor="gray.100">
          <HStack>
            <Button
              onClick={() => {
                setInputMessagesToSave(savedInputMessages);
                setOutputMessageToSave(savedOutputMessage);
              }}
            >
              Reset
            </Button>
            <Button isLoading={savingInProgress} onClick={onSave}>
              Save
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
