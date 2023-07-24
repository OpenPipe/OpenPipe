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
import { useEffect, useRef } from "react";
import { BsTrash } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";

export const DeleteButton = () => {
  const experiment = useExperiment();
  const deleteMutation = api.experiments.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onDeleteConfirm] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    await deleteMutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments" });
    onClose();
  }, [deleteMutation, experiment.data?.id, router]);

  useEffect(() => {
    useAppStore.getState().sharedVariantEditor.loadMonaco().catch(console.error);
  });

  return (
    <>
      <Button
        size="sm"
        variant={{ base: "outline", lg: "ghost" }}
        colorScheme="gray"
        fontWeight="normal"
        onClick={onOpen}
      >
        <Icon as={BsTrash} boxSize={4} color="gray.600" />
        <Text display={{ base: "none", lg: "block" }} ml={2}>
          Delete Experiment
        </Text>
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
