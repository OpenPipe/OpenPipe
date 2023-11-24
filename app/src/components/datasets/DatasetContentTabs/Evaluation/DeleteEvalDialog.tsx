import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  VStack,
  Text,
} from "@chakra-ui/react";

import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useAppStore } from "~/state/store";

const DeleteEvalDialog = ({
  evalName,
  isOpen,
  onCancel,
  onConfirm,
}: {
  evalName?: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const datasetEvalIdToEdit = useAppStore((state) => state.evaluationsSlice.datasetEvalIdToEdit);
  const dataset = useDataset().data;

  const deleteMutation = api.datasetEvals.delete.useMutation();

  const utils = api.useContext();

  const [onDeleteConfirm, deleteInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetEvalIdToEdit) return;
    const resp = await deleteMutation.mutateAsync({ id: datasetEvalIdToEdit });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.listTestingEntries.invalidate({ datasetId: dataset?.id });
    await utils.datasets.get.invalidate();

    onConfirm();
  }, [deleteMutation, datasetEvalIdToEdit, dataset?.id, onConfirm]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onCancel}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Eval
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure that you want to delete <b>{evalName}</b> and all of its associated
                data?
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} isDisabled={deleteInProgress} onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={3} isLoading={deleteInProgress} onClick={onDeleteConfirm}>
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteEvalDialog;
