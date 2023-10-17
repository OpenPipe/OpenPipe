import { useRef } from "react";
import {
  type UseDisclosureReturn,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
} from "@chakra-ui/react";
import { api } from "~/utils/api";

import { useHandledAsyncCallback } from "~/utils/hooks";

const DeleteDatasetDialog = ({
  datasetId,
  onDelete,
  disclosure,
}: {
  datasetId?: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.datasets.delete.useMutation();
  const utils = api.useContext();

  const [onDeleteConfirm, deletionInProgress] = useHandledAsyncCallback(async () => {
    if (!datasetId) return;
    await mutation.mutateAsync({ id: datasetId });
    await utils.datasets.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, datasetId, disclosure.onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Dataset
          </AlertDialogHeader>

          <AlertDialogBody>
            If you delete this dataset all the associated dataset entries and fine-tuned models will
            be deleted as well. Are you sure?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              isLoading={deletionInProgress}
              onClick={onDeleteConfirm}
              ml={3}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteDatasetDialog;
