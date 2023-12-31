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
import { useSession } from "next-auth/react";

import { useRouter } from "next/router";
import { useRef } from "react";
import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

export type ProjectUser = RouterOutputs["projects"]["get"]["projectUsers"][number];

export const RemoveProjectUserDialog = ({
  isOpen,
  onClose,
  projectUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectUser: ProjectUser | null;
}) => {
  const selectedProject = useSelectedProject().data;
  const removeUserMutation = api.users.removeUserFromProject.useMutation();
  const utils = api.useContext();
  const router = useRouter();

  const removingSelf = projectUser?.userId === useSession().data?.user?.id;

  const cancelRef = useRef<HTMLButtonElement>(null);

  const [onRemoveConfirm, isRemoving] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.id || !projectUser?.userId) return;
    await removeUserMutation.mutateAsync({
      projectId: selectedProject.id,
      userId: projectUser.userId,
    });
    await utils.projects.get.invalidate();
    onClose();
    if (removingSelf) {
      await router.push("/");
    }
  }, [removeUserMutation, selectedProject, router, removingSelf]);

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {removingSelf ? "Leave Project" : "Remove Member"}
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              {removingSelf ? (
                <Text>
                  Are you sure you want to leave <b>{selectedProject?.name}</b>?
                </Text>
              ) : (
                <Text>
                  Are you sure you want to remove <b>{projectUser?.name}</b> from the project?
                </Text>
              )}
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onRemoveConfirm} ml={3} w={20}>
              {isRemoving ? <Spinner /> : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
