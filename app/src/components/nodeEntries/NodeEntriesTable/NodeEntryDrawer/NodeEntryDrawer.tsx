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
} from "@chakra-ui/react";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import { type DatasetEntrySplit } from "@prisma/client";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import { useNodeEntry, useHandledAsyncCallback } from "~/utils/hooks";
import EntrySplitDropdown from "./EntrySplitDropdown";
import dayjs from "~/utils/dayjs";
import useKeepScrollAtBottom from "./useKeepScrollAtBottom";
import InputEditor from "./InputEditor";
import ToolsEditor from "./ToolsEditor";
import OutputEditor from "./OutputEditor";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const CONTAINER_ID = "drawer-container";
const CONTENT_ID = "drawer-content";

export type UpdateEntryCallback = (input: {
  id: string;
  updates: { split?: "TRAIN" | "TEST"; messages?: string; tools?: string; output?: string };
}) => Promise<void>;

function NodeEntryDrawer({
  nodeEntryPersistentId,
  nodeId,
  setNodeEntryPersistentId,
  updateEntry,
}: {
  nodeEntryPersistentId: string | null;
  nodeId?: string;
  setNodeEntryPersistentId: (id: string | null) => void;
  updateEntry: UpdateEntryCallback;
}) {
  const utils = api.useUtils();

  const { data: nodeEntry, isLoading } = useNodeEntry({
    nodeId,
    persistentId: nodeEntryPersistentId,
  });

  const savedInputMessages = useMemo(() => nodeEntry?.messages, [nodeEntry]);
  const savedTools = useMemo(() => nodeEntry?.tools, [nodeEntry]);
  const savedOutputMessage = useMemo(() => nodeEntry?.output, [nodeEntry]);

  const [inputMessagesToSave, setInputMessagesToSave] = useState<ChatCompletionMessageParam[]>([]);
  const [toolsToSave, setToolsToSave] = useState<string>(JSON.stringify([]));
  const [outputMessageToSave, setOutputMessageToSave] = useState<ChatCompletionMessageParam | null>(
    null,
  );

  useEffect(() => {
    if (savedInputMessages && savedOutputMessage) {
      setInputMessagesToSave(savedInputMessages);
      setToolsToSave(JSON.stringify(savedTools || []));
      setOutputMessageToSave(savedOutputMessage);
    }
  }, [savedInputMessages, savedTools, savedOutputMessage]);

  const hasUpdates = useMemo(
    () =>
      !isEqual(nodeEntry?.messages, inputMessagesToSave) ||
      !isEqual(JSON.stringify(nodeEntry?.tools || []), toolsToSave) ||
      !isEqual(nodeEntry?.output, outputMessageToSave),
    [nodeEntry, inputMessagesToSave, toolsToSave, outputMessageToSave],
  );

  const [onSave, savingInProgress] = useHandledAsyncCallback(async () => {
    if (!nodeEntry?.id || !inputMessagesToSave) return;

    await updateEntry({
      id: nodeEntry.id,
      updates: {
        messages: JSON.stringify(inputMessagesToSave),
        tools: toolsToSave,
        output: JSON.stringify(outputMessageToSave),
      },
    });

    await utils.nodeEntries.list.invalidate();
    await utils.nodeEntries.get.invalidate();
  }, [updateEntry, nodeEntry?.id, inputMessagesToSave, toolsToSave, outputMessageToSave, utils]);

  const [onUpdateSplit] = useHandledAsyncCallback(
    async (split: DatasetEntrySplit) => {
      if (!nodeEntry?.id) return;

      await updateEntry({
        id: nodeEntry.id,
        updates: {
          split,
        },
      });

      await utils.nodeEntries.list.invalidate();
      await utils.nodeEntries.get.invalidate();
    },
    [updateEntry, nodeEntry?.id, utils],
  );

  useKeepScrollAtBottom(CONTAINER_ID, CONTENT_ID);

  return (
    <Drawer
      isOpen={!!nodeEntryPersistentId}
      onClose={() => setNodeEntryPersistentId(null)}
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
              {nodeEntry && (
                <ConditionallyEnable
                  accessRequired="requireCanModifyProject"
                  accessDeniedText="Only project members can modify the training split of a dataset entry"
                >
                  <EntrySplitDropdown split={nodeEntry.split} onChange={onUpdateSplit} />
                </ConditionallyEnable>
              )}
            </HStack>
          </VStack>
        </DrawerHeader>
        <DrawerBody h="full" pb={4} bgColor="gray.100" id={CONTAINER_ID}>
          <VStack w="full" spacing={4} pb={4} id={CONTENT_ID}>
            {nodeEntry && (
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
                <Text>
                  <Text as="span" fontWeight="bold">
                    Last Processed:
                  </Text>{" "}
                  {dayjs(nodeEntry.updatedAt).format("MMMM D h:mm A")}
                </Text>
              </VStack>
            )}
            <InputEditor
              inputMessagesToSave={inputMessagesToSave}
              setInputMessagesToSave={setInputMessagesToSave}
              matchedRules={nodeEntry?.matchedRules}
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
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[[hasUpdates, "No changes to save"]]}
            >
              <Button
                isLoading={isLoading || savingInProgress}
                onClick={onSave}
                colorScheme="orange"
              >
                Save
              </Button>
            </ConditionallyEnable>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Ensure that drawer does not constantly re-render when parent polls dataset entry list
export default React.memo(NodeEntryDrawer);
