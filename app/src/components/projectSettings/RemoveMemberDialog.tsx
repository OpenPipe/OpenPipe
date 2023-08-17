import {
  Button,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { type User } from "@prisma/client";

import { useRouter } from "next/router";
import { useRef } from "react";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

export const RemoveMemberDialog = ({
  isOpen,
  onClose,
  member,
}: {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
}) => {
  const selectedProject = useSelectedProject();
  const removeUserMutation = api.users.removeUserFromProject.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onRemoveConfirm, isRemoving] = useHandledAsyncCallback(async () => {
    if (!selectedProject.data?.id || !member?.id) return;
    await removeUserMutation.mutateAsync({ projectId: selectedProject.data.id, userId: member.id });
    await utils.projects.get.invalidate();
    onClose();
  }, [removeUserMutation, selectedProject, router]);

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove Member
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure you want to remove <b>{member?.name}</b> from the project?
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onRemoveConfirm} ml={3} w={20}>
              {isRemoving ? <Spinner /> : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
