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
  Divider,
  Icon,
} from "@chakra-ui/react";
import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { BsPlus } from "react-icons/bs";
import { type DatasetEntryType } from "@prisma/client";

import { api } from "~/utils/api";
import { useDatasetEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EditableMessage from "./EditableMessage";
import EntryTypeDropdown from "./EntryTypeDropdown";

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

  const [onUpdateType] = useHandledAsyncCallback(
    async (type: DatasetEntryType) => {
      if (!datasetEntryId) return;
      await updateMutation.mutateAsync({
        id: datasetEntryId,
        updates: {
          type,
        },
      });
      await utils.datasetEntries.list.invalidate();
      await utils.datasetEntries.get.invalidate({ id: datasetEntryId });
    },
    [updateMutation, datasetEntryId, utils],
  );

  return (
    <Drawer isOpen={!!datasetEntryId} onClose={clearDatasetEntryId} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton pt={6} />
        <DrawerHeader bgColor="orange.50">
          <HStack w="full" justifyContent="space-between" pr={8}>
            <Heading size="md">Dataset Entry</Heading>
            {datasetEntry && (
              <EntryTypeDropdown type={datasetEntry.type} onTypeChange={onUpdateType} />
            )}
          </HStack>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="orange.50">
          <VStack h="full" justifyContent="space-between">
            <VStack w="full" spacing={12} py={4}>
              <VStack w="full" alignItems="flex-start">
                <Text fontWeight="bold">Input</Text>
                {inputMessagesToSave.map((message, i) => {
                  return (
                    <>
                      <Divider key={`divider-${i}`} my={4} />
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
                    </>
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
                  _hover={{ bgColor: "orange.100" }}
                >
                  <HStack spacing={0}>
                    <Text>Add Message</Text>
                    <Icon as={BsPlus} boxSize={6} />
                  </HStack>
                </Button>
              </VStack>
              <VStack w="full" alignItems="flex-start">
                <Text fontWeight="bold">Output</Text>
                <Divider my={4} />
                <EditableMessage
                  message={outputMessageToSave}
                  onEdit={(message) => setOutputMessageToSave(message)}
                  isOutput
                />
              </VStack>
            </VStack>
          </VStack>
        </DrawerBody>
        <DrawerFooter bgColor="orange.50">
          <HStack>
            <Button
              onClick={() => {
                setInputMessagesToSave(savedInputMessages);
                setOutputMessageToSave(savedOutputMessage);
              }}
            >
              Reset
            </Button>
            <Button isLoading={savingInProgress} onClick={onSave} colorScheme="orange">
              Save
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
