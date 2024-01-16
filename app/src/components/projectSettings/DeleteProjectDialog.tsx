import {
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Input,
  Text,
  VStack,
  Box,
  Spinner,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

export const DeleteProjectDialog = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const selectedProject = useSelectedProject();
  const deleteMutation = api.projects.delete.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onDeleteConfirm, isDeleting] = useHandledAsyncCallback(async () => {
    if (!selectedProject.data?.id) return;
    await deleteMutation.mutateAsync({ id: selectedProject.data.id });
    await utils.projects.list.invalidate();
    await router.push({ pathname: "/" });
    onClose();
  }, [deleteMutation, selectedProject, router]);

  const [nameToDelete, setNameToDelete] = useState("");

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Project
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                If you delete this project all the associated data and experiments will be deleted
                as well. If you are sure that you want to delete this project, please type the name
                of the project below.
              </Text>
              <Box bgColor="orange.100" w="full" p={2} borderRadius={4}>
                <Text fontFamily="inconsolata">{selectedProject.data?.name}</Text>
              </Box>
              <Input
                placeholder={selectedProject.data?.name}
                value={nameToDelete}
                onChange={(e) => setNameToDelete(e.target.value)}
              />
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={onDeleteConfirm}
              ml={3}
              isDisabled={nameToDelete !== selectedProject.data?.name}
              w={20}
            >
              {isDeleting ? <Spinner /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
