import {
  Button,
  Icon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Text,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useRef } from "react";
import { BsTrash } from "react-icons/bs";
import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export const DeleteButton = () => {
  const experiment = useExperiment();
  const mutation = api.experiments.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const closeDrawer = useAppStore((s) => s.closeDrawer);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    await mutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments" });
    closeDrawer();

    onClose();
  }, [mutation, experiment.data?.id, router]);

  return (
    <>
      <Button size="sm" variant="ghost" colorScheme="red" fontWeight="normal" onClick={onOpen}>
        <Icon as={BsTrash} boxSize={4} />
        <Text ml={2}>Delete Experiment</Text>
      </Button>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
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
    </>
  );
};
