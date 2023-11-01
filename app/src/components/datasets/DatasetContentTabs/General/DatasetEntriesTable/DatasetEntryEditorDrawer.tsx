import React, { useState, useEffect, useMemo } from "react";
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
  Collapse,
} from "@chakra-ui/react";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { BsPlus } from "react-icons/bs";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { type DatasetEntryType } from "@prisma/client";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import { useDatasetEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EditableMessage from "./EditableMessage";
import EntryTypeDropdown from "./EntryTypeDropdown";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import dayjs from "~/utils/dayjs";
import DatasetEntryHistoryRow from "./DatasetEntryHistoryRow";

function DatasetEntryEditorDrawer({
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
  const [historyVisible, setHistoryVisible] = useState(false);

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
      size="xl"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton mt={3} mr={6} />
        <DrawerHeader bgColor="orange.50">
          <VStack w="full" alignItems="flex-start">
            <HStack w="full" justifyContent="space-between" pr={12}>
              <Heading size="md">Dataset Entry</Heading>
              {datasetEntry && (
                <EntryTypeDropdown type={datasetEntry.type} onTypeChange={onUpdateType} />
              )}
            </HStack>
          </VStack>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="orange.50">
          <VStack w="full" spacing={12} pb={4}>
            {datasetEntry && (
              <VStack
                w="full"
                alignItems="flex-start"
                fontSize="xs"
                bgColor="gray.50"
                borderRadius={8}
                borderWidth={1}
                borderColor="gray.200"
                p={4}
              >
                {datasetEntry?.importId && (
                  <>
                    <Text>
                      <Text as="span" fontWeight="bold">
                        Import ID:
                      </Text>{" "}
                      {datasetEntry.importId}
                    </Text>
                  </>
                )}
                <Text>
                  <Text as="span" fontWeight="bold">
                    Last Updated:
                  </Text>{" "}
                  {dayjs(datasetEntry.createdAt).format("MMMM D h:mm A")}
                </Text>
                <VStack w="full" alignItems="flex-start" spacing={0} pt={4}>
                  <HStack
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => setHistoryVisible(!historyVisible)}
                    cursor="pointer"
                    fontWeight="bold"
                    spacing={0.5}
                  >
                    <Text>Version History</Text>
                    <Icon
                      as={historyVisible ? FiChevronUp : FiChevronDown}
                      strokeWidth={3}
                      boxSize={3.5}
                      pt={0.5}
                    />
                  </HStack>
                  <Collapse in={historyVisible} unmountOnExit={true}>
                    <VStack align="stretch" spacing={0} pt={2}>
                      {datasetEntry?.history.map((entry, i) => (
                        <DatasetEntryHistoryRow key={entry.id} entry={entry} isFirst={i === 0} />
                      ))}
                    </VStack>
                  </Collapse>
                </VStack>
              </VStack>
            )}
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

// Ensure that drawer does not constantly re-render when parent polls dataset entry list
export default React.memo(DatasetEntryEditorDrawer);
