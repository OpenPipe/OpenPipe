import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  HStack,
  VStack,
  Icon,
  Text,
  Button,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useDataset } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "~/components/ActionButton";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import pluralize from "pluralize";

const DeleteButton = () => {
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Delete Rows"
        icon={BsTrash}
        isDisabled={selectedIds.size === 0}
      />
      <DeleteDatasetEntriesModal disclosure={disclosure} />
    </>
  );
};

export default DeleteButton;

const DeleteDatasetEntriesModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  const clearSelectedIds = useAppStore((s) => s.selectedDatasetEntries.clearSelectedIds);

  const deleteRowsMutation = api.datasetEntries.delete.useMutation();

  const utils = api.useContext();

  const [deleteRows, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset?.id || !selectedIds.size) return;

    // divide selectedIds into chunks of 15000 to reduce request size
    const chunkSize = 15000;
    const idsArray = Array.from(selectedIds);
    for (let i = 0; i < idsArray.length; i += chunkSize) {
      const response = await deleteRowsMutation.mutateAsync({
        ids: idsArray.slice(i, i + chunkSize),
      });

      if (maybeReportError(response)) return;
    }

    await utils.datasetEntries.list.invalidate();
    disclosure.onClose();
    clearSelectedIds();
  }, [deleteRowsMutation, dataset, selectedIds, utils]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={BsTrash} />
            <Text>Delete Logs</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <Text>
              Are you sure you want to delete the <b>{selectedIds.size.toLocaleString()}</b>{" "}
              {pluralize("row", selectedIds.size)} rows you've selected?
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={deleteRows} isLoading={deletionInProgress} minW={24}>
              Delete
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
