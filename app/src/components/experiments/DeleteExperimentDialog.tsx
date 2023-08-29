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

const DeleteExperimentDialog = ({
  experimentId,
  onDelete,
  disclosure,
}: {
  experimentId?: string;
  onDelete?: () => void;
  disclosure: UseDisclosureReturn;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mutation = api.experiments.delete.useMutation();
  const utils = api.useContext();

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!experimentId) return;
    await mutation.mutateAsync({ id: experimentId });
    await utils.experiments.list.invalidate();
    onDelete?.();

    disclosure.onClose();
  }, [mutation, experimentId, disclosure.onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Experiment
          </AlertDialogHeader>

          <AlertDialogBody>
            If you delete this experiment all the associated prompts and scenarios will be deleted
            as well. Are you sure?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onDeleteConfirm} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default DeleteExperimentDialog;
