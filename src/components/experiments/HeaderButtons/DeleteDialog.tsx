import {
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useRef } from "react";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export const DeleteDialog = ({ onClose }: { onClose: () => void }) => {
  const experiment = useExperiment();
  const deleteMutation = api.experiments.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    await deleteMutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments" });
    onClose();
  }, [deleteMutation, experiment.data?.id, router]);

  return (
    <AlertDialog isOpen leastDestructiveRef={cancelRef} onClose={onClose}>
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
            <Button ref={cancelRef} onClick={onClose}>
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
