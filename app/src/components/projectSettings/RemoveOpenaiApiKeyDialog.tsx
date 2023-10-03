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
  type UseDisclosureReturn,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useRef } from "react";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";

const RemoveOpenaiApiKeyDialog = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProject = useSelectedProject();
  const utils = api.useContext();
  const router = useRouter();

  const cancelRef = useRef<HTMLButtonElement>(null);

  const updateProjectMutation = api.projects.update.useMutation();

  const [removeOpenaiApiKey, isRemoving] = useHandledAsyncCallback(async () => {
    if (!selectedProject.data?.id) return;
    await updateProjectMutation.mutateAsync({
      id: selectedProject.data.id,
      updates: { openaiApiKey: null },
    });
    await utils.projects.get.invalidate();
    disclosure.onClose();
  }, [updateProjectMutation, selectedProject, router, disclosure.onClose]);

  return (
    <AlertDialog leastDestructiveRef={cancelRef} {...disclosure}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove OpenAI API Key
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} alignItems="flex-start">
              <Text>
                Are you sure you want to remove your existing OpenAI API key from the project?
              </Text>
              <Text>
                Without a key, you will not be able to submit fine-tune jobs or run inference
                against existing fine-tuned OpenAI models.
              </Text>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={disclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={removeOpenaiApiKey}
              ml={3}
              w={20}
              isLoading={isRemoving}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default RemoveOpenaiApiKeyDialog;
