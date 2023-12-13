import React, { useState, useEffect, useMemo, Fragment } from "react";
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
  Icon,
  Collapse,
} from "@chakra-ui/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { type DatasetEntrySplit } from "@prisma/client";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import { useDatasetEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EntrySplitDropdown from "./EntrySplitDropdown";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import dayjs from "~/utils/dayjs";
import DatasetEntryHistoryRow from "../DatasetEntryHistoryRow";
import useKeepScrollAtBottom from "./useKeepScrollAtBottom";
import InputEditor from "./InputEditor";
import ToolsEditor from "./ToolsEditor";
import OutputEditor from "./OutputEditor";

const CONTAINER_ID = "drawer-container";
const CONTENT_ID = "drawer-content";

function DatasetEntryDrawer({
  datasetEntryId,
  setDatasetEntryId,
}: {
  datasetEntryId: string | null;
  setDatasetEntryId: (id: string | null) => void;
}) {
  const utils = api.useContext();

  const { data: datasetEntry, isLoading } = useDatasetEntry(datasetEntryId);

  const savedInputMessages = useMemo(() => datasetEntry?.messages, [datasetEntry]);
  const savedTools = useMemo(() => datasetEntry?.tools, [datasetEntry]);
  const savedOutputMessage = useMemo(() => datasetEntry?.output, [datasetEntry]);

  const [inputMessagesToSave, setInputMessagesToSave] = useState<ChatCompletionMessageParam[]>([]);
  const [toolsToSave, setToolsToSave] = useState<string>(JSON.stringify([]));
  const [outputMessageToSave, setOutputMessageToSave] = useState<ChatCompletionMessageParam | null>(
    null,
  );
  const [historyVisible, setHistoryVisible] = useState(false);

  useEffect(() => {
    if (savedInputMessages && savedOutputMessage) {
      setInputMessagesToSave(savedInputMessages);
      setToolsToSave(JSON.stringify(savedTools || []));
      setOutputMessageToSave(savedOutputMessage);
    }
  }, [savedInputMessages, savedTools, savedOutputMessage]);

  const hasUpdates = useMemo(
    () =>
      !isEqual(datasetEntry?.messages, inputMessagesToSave) ||
      !isEqual(JSON.stringify(datasetEntry?.tools || []), toolsToSave) ||
      !isEqual(datasetEntry?.output, outputMessageToSave),
    [datasetEntry, inputMessagesToSave, toolsToSave, outputMessageToSave],
  );

  const updateMutation = api.datasetEntries.update.useMutation();
  const [onSave, savingInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetEntryId || !inputMessagesToSave) return;
    const resp = await updateMutation.mutateAsync({
      id: datasetEntryId,
      updates: {
        messages: JSON.stringify(inputMessagesToSave),
        tools: toolsToSave,
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
    toolsToSave,
    outputMessageToSave,
    utils,
  ]);

  const [onUpdateSplit] = useHandledAsyncCallback(
    async (split: DatasetEntrySplit) => {
      if (!datasetEntryId) return;
      const resp = await updateMutation.mutateAsync({
        id: datasetEntryId,
        updates: {
          split,
        },
      });
      if (maybeReportError(resp)) return;
      await utils.datasetEntries.list.invalidate();
      setDatasetEntryId(resp.payload);
    },
    [updateMutation, datasetEntryId, setDatasetEntryId, utils],
  );

  useKeepScrollAtBottom(CONTAINER_ID, CONTENT_ID);

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
        <DrawerHeader bgColor="gray.100">
          <VStack w="full" alignItems="flex-start">
            <HStack w="full" justifyContent="space-between" pr={12}>
              <Heading size="md">Dataset Entry</Heading>
              {datasetEntry && (
                <EntrySplitDropdown split={datasetEntry.split} onChange={onUpdateSplit} />
              )}
            </HStack>
          </VStack>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="gray.100" id={CONTAINER_ID}>
          <VStack w="full" spacing={4} pb={4} id={CONTENT_ID}>
            {datasetEntry && (
              <VStack
                w="full"
                alignItems="flex-start"
                fontSize="xs"
                bgColor="white"
                borderRadius={4}
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
            <InputEditor
              inputMessagesToSave={inputMessagesToSave}
              setInputMessagesToSave={setInputMessagesToSave}
              matchedRules={datasetEntry?.matchedRules}
            />
            <ToolsEditor toolsToSave={toolsToSave} setToolsToSave={setToolsToSave} />
            <OutputEditor
              outputMessageToSave={outputMessageToSave}
              setOutputMessageToSave={setOutputMessageToSave}
            />
          </VStack>
        </DrawerBody>
        <DrawerFooter bgColor="gray.100">
          <HStack>
            <Button
              isDisabled={isLoading || !hasUpdates}
              onClick={() => {
                savedInputMessages && setInputMessagesToSave(savedInputMessages);
                savedTools && setToolsToSave(JSON.stringify(savedTools));
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
export default React.memo(DatasetEntryDrawer);
