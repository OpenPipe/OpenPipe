import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
  Text,
  Spinner,
  HStack,
} from "@chakra-ui/react";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";
import { useState } from "react";
import AutoResizeTextArea from "../AutoResizeTextArea";
import CompareFunctions from "./CompareFunctions";

export const RefinePromptModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const utils = api.useContext();

  const { mutateAsync: getRefinedPromptMutateAsync, data: refinedPromptFn } =
    api.promptVariants.getRefinedPromptFn.useMutation();
  const [instructions, setInstructions] = useState<string>("");

  const [getRefinedPromptFn, refiningInProgress] = useHandledAsyncCallback(async () => {
    if (!variant.experimentId) return;
    await getRefinedPromptMutateAsync({
      id: variant.id,
      instructions,
    });
  }, [getRefinedPromptMutateAsync, onClose, variant, instructions]);

  const replaceVariantMutation = api.promptVariants.replaceVariant.useMutation();

  const [replaceVariant, replacementInProgress] = useHandledAsyncCallback(async () => {
    if (!variant.experimentId || !refinedPromptFn) return;
    await replaceVariantMutation.mutateAsync({
      id: variant.id,
      constructFn: refinedPromptFn,
    });
    await utils.promptVariants.list.invalidate();
    onClose();
  }, [replaceVariantMutation, variant, onClose, refinedPromptFn]);

  return (
    <Modal isOpen onClose={onClose} size={{ base: "xl", sm: "2xl", md: "7xl" }}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>Refine Your Prompt</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <HStack w="full">
              <AutoResizeTextArea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                    getRefinedPromptFn();
                  }
                }}
                placeholder="Use chain of thought"
              />
              <Button onClick={getRefinedPromptFn}>
                {refiningInProgress ? <Spinner boxSize={4} /> : <Text>Submit</Text>}
              </Button>
            </HStack>
            <CompareFunctions
              originalFunction={variant.constructFn}
              newFunction={refinedPromptFn}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="blue"
              onClick={replaceVariant}
              minW={24}
              disabled={!refinedPromptFn}
            >
              {replacementInProgress ? <Spinner boxSize={4} /> : <Text>Accept</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
