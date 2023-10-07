import {
  Button,
  FormControl,
  FormLabel,
  Input,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";

import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

const UpdateOpenaiApiKeyModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProject = useSelectedProject().data;
  const utils = api.useContext();

  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setApiKey("");
  }, [disclosure.isOpen]);

  const updateProjectMutation = api.projects.update.useMutation();

  const [updateKey, isUpdating] = useHandledAsyncCallback(async () => {
    if (!selectedProject?.id || !apiKey) return;
    const resp = await updateProjectMutation.mutateAsync({
      id: selectedProject.id,
      updates: { openaiApiKey: apiKey },
    });
    if (maybeReportError(resp)) return;
    await utils.projects.get.invalidate();
    disclosure.onClose();
  }, [updateProjectMutation, selectedProject?.id, apiKey, disclosure.onClose]);

  return (
    <Modal size={{ base: "lg", md: "xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Text>Update OpenAI Key</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={8} alignItems="flex-start">
            <Text>
              This key will be used to submit fine-tune jobs and run inference against fine-tuned
              models in <b>{selectedProject?.name}</b>.
            </Text>

            <FormControl>
              <FormLabel>OpenAI API Key</FormLabel>
              <Input
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                    e.preventDefault();
                    e.currentTarget.blur();
                    updateKey();
                  }
                }}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter mt={4}>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              <Text>Cancel</Text>
            </Button>
            <Button
              colorScheme="orange"
              onClick={updateKey}
              minW={24}
              isLoading={isUpdating}
              isDisabled={!apiKey}
            >
              Save Key
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdateOpenaiApiKeyModal;
