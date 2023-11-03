import {
  VStack,
  Text,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Box,
  Input,
  Link as ChakraLink,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { AiOutlineEdit } from "react-icons/ai";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import pluralize from "pluralize";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import ActionButton from "~/components/ActionButton";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useFilters } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

const RelabelButton = () => {
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Relabel"
        icon={AiOutlineEdit}
        isDisabled={selectedIds.size === 0}
      />
      <RelabelDatasetEntriesDialog disclosure={disclosure} />
    </>
  );
};

export default RelabelButton;

const RelabelDatasetEntriesDialog = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const mutation = api.datasetEntries.relabel.useMutation();
  const utils = api.useContext();

  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  const clearSelectedIds = useAppStore((s) => s.selectedDatasetEntries.clearSelectedIds);
  const addFilter = useFilters().addFilter;

  const [onRelabelConfirm, confirmingRelabelInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedIds) return;
    const resp = await mutation.mutateAsync({
      ids: Array.from(selectedIds),
    });
    if (maybeReportError(resp)) return;
    const { batchId } = resp.payload;

    addFilter({
      id: Date.now().toString(),
      field: GeneralFiltersDefaultFields.RelabelBatchId,
      comparator: "=",
      value: batchId.toString(),
    });

    clearSelectedIds();
    await utils.datasets.get.invalidate();

    disclosure.onClose();
  }, [mutation, selectedIds, clearSelectedIds, addFilter, disclosure.onClose]);

  const [numEntriesToConfirm, setNumEntriesToConfirm] = useState("");

  useEffect(() => {
    if (disclosure.isOpen) {
      setNumEntriesToConfirm("");
    }
  }, [disclosure.isOpen, setNumEntriesToConfirm]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Relabel with GPT-4
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                The {pluralize("entry", selectedIds.size)} you've selected will be relabeled using
                GPT-4. This project's OpenAI API key will be used for the API calls.
              </Text>

              {needsMissingOpenaiKey ? (
                <Text>
                  To relabel these entries, add your OpenAI API key on the{" "}
                  <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <VStack>
                  <Text>
                    To confirm this change and relabel <b>{selectedIds.size}</b>{" "}
                    {pluralize("entry", selectedIds.size)} using output from GPT-4, please type the
                    number of entries below.
                  </Text>
                  <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                    <Text fontFamily="inconsolata">{selectedIds.size}</Text>
                  </Box>
                  <Input
                    isDisabled={needsMissingOpenaiKey}
                    placeholder={selectedIds.size.toString()}
                    value={numEntriesToConfirm}
                    onChange={(e) => setNumEntriesToConfirm(e.target.value)}
                  />
                </VStack>
              )}
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              isDisabled={confirmingRelabelInProgress}
              onClick={disclosure.onClose}
            >
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              ml={3}
              isDisabled={
                needsMissingOpenaiKey || numEntriesToConfirm !== selectedIds.size.toString()
              }
              isLoading={confirmingRelabelInProgress}
              onClick={onRelabelConfirm}
            >
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
