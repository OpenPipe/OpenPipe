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
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { BsPlus } from "react-icons/bs";
import { type DatasetEntryType } from "@prisma/client";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import { useDatasetEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EditableMessage from "./EditableMessage";
import EntryTypeDropdown from "./EntryTypeDropdown";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export default function DatasetEntryEditorDrawer({
  datasetEntryId,
  setDatasetEntryId,
}: {
  datasetEntryId: string | null;
  setDatasetEntryId: (id: string | null) => void;
}) {
  const utils = api.useContext();

  const { data: datasetEntry, isLoading } = useDatasetEntry(datasetEntryId);

  const savedInputMessages = useMemo(() => datasetEntry?.messages, [datasetEntry]);
  const savedOutputMessage = useMemo(() => datasetEntry?.output, [datasetEntry]);

  const [inputMessagesToSave, setInputMessagesToSave] = useState<ChatCompletionMessageParam[]>([]);
  const [outputMessageToSave, setOutputMessageToSave] = useState<ChatCompletionMessageParam | null>(
    null,
  );

  useEffect(() => {
    if (savedInputMessages && savedOutputMessage) {
      setInputMessagesToSave(savedInputMessages);
      setOutputMessageToSave(savedOutputMessage);
    }
  }, [savedInputMessages, savedOutputMessage]);

  const hasUpdates = useMemo(
    () =>
      !isEqual(datasetEntry?.messages, inputMessagesToSave) ||
      !isEqual(datasetEntry?.output, outputMessageToSave),
    [datasetEntry, inputMessagesToSave, outputMessageToSave],
  );

  const updateMutation = api.datasetEntries.update.useMutation();
  const [onSave, savingInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetEntryId || !inputMessagesToSave) return;
    const resp = await updateMutation.mutateAsync({
      id: datasetEntryId,
      updates: {
        input: JSON.stringify(inputMessagesToSave),
        output: JSON.stringify(outputMessageToSave),
      },
    });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.list.invalidate();
    setDatasetEntryId(resp.payload);
  }, [
    updateMutation,
    datasetEntryId,
    setDatasetEntryId,
    inputMessagesToSave,
    outputMessageToSave,
    utils,
  ]);

  const [onUpdateType] = useHandledAsyncCallback(
    async (type: DatasetEntryType) => {
      if (!datasetEntryId) return;
      const resp = await updateMutation.mutateAsync({
        id: datasetEntryId,
        updates: {
          type,
        },
      });
      if (maybeReportError(resp)) return;
      await utils.datasetEntries.list.invalidate();
      setDatasetEntryId(resp.payload);
    },
    [updateMutation, datasetEntryId, setDatasetEntryId, utils],
  );

  return (
    <Drawer
      isOpen={!!datasetEntryId}
      onClose={() => setDatasetEntryId(null)}
      placement="right"
      size="md"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton mt={3} />
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
                        ruleMatches={datasetEntry?.matchedRules}
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
              isDisabled={isLoading || !hasUpdates}
              onClick={() => {
                savedInputMessages && setInputMessagesToSave(savedInputMessages);
                savedOutputMessage && setOutputMessageToSave(savedOutputMessage);
              }}
            >
              Reset
            </Button>
            <Button
              isLoading={savingInProgress}
              isDisabled={isLoading || !hasUpdates}
              onClick={onSave}
              colorScheme="orange"
            >
              Save
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
