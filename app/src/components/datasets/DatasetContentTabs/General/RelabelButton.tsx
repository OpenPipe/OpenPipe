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
  Checkbox,
  HStack,
} from "@chakra-ui/react";
import { AiOutlineEdit } from "react-icons/ai";
import { useRef, useState, useEffect } from "react";
import pluralize from "pluralize";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import ActionButton from "~/components/ActionButton";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useFilters } from "~/components/Filters/useFilters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { ProjectLink } from "~/components/ProjectLink";
import InfoCircle from "~/components/InfoCircle";

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

  const [numEntriesToConfirm, setNumEntriesToConfirm] = useState("");
  const [filterToRelabeled, setFilterToRelabeled] = useState(true);

  const [onRelabelConfirm, confirmingRelabelInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedIds || numEntriesToConfirm !== selectedIds.size.toString()) return;
    const resp = await mutation.mutateAsync({
      ids: Array.from(selectedIds),
    });
    if (maybeReportError(resp)) return;

    if (filterToRelabeled) {
      addFilter({
        id: Date.now().toString(),
        field: GeneralFiltersDefaultFields.RelabelBatchId,
        comparator: "=",
        value: resp.payload.batchId.toString(),
      });
    }

    await utils.datasets.get.invalidate();
    await utils.datasetEntries.list.invalidate();

    clearSelectedIds();

    disclosure.onClose();
  }, [
    mutation,
    selectedIds,
    clearSelectedIds,
    addFilter,
    numEntriesToConfirm,
    filterToRelabeled,
    disclosure.onClose,
  ]);

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
                  <ChakraLink as={ProjectLink} href="/settings" target="_blank" color="blue.600">
                    <Text as="span">project settings</Text>
                  </ChakraLink>{" "}
                  page.
                </Text>
              ) : (
                <VStack alignItems="flex-start">
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRelabelConfirm();
                      }
                    }}
                  />
                  <HStack>
                    <Checkbox
                      isChecked={filterToRelabeled}
                      onChange={(e) => setFilterToRelabeled(e.target.checked)}
                      colorScheme="orange"
                    >
                      Filter to relabeled entries
                    </Checkbox>
                    <InfoCircle tooltipText="Filter to the dataset entries table to only show entries that are being relabeled." />
                  </HStack>
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
            <ConditionallyEnable
              accessRequired="requireCanModifyProject"
              checks={[
                [!needsMissingOpenaiKey, "OpenAI Key is required to relabel"],
                [
                  numEntriesToConfirm === selectedIds.size.toString(),
                  "Please confirm the number of entries",
                ],
              ]}
            >
              <Button
                colorScheme="orange"
                ml={3}
                isLoading={confirmingRelabelInProgress}
                onClick={onRelabelConfirm}
              >
                Confirm
              </Button>
            </ConditionallyEnable>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
