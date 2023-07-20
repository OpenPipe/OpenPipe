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
  InputGroup,
  Input,
  InputRightElement,
  Icon,
} from "@chakra-ui/react";
import { IoMdSend } from "react-icons/io";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";
import { useState } from "react";
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
        <ModalHeader>Refine with GPT-4</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={16} pt={8}>
            <InputGroup
              size="md"
              w="full"
              maxW="600"
              boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
              borderRadius={8}
              alignItems="center"
              colorScheme="orange"
            >
              <Input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                    getRefinedPromptFn();
                  }
                }}
                placeholder="Send instructions"
                py={7}
                px={4}
                colorScheme="orange"
                borderColor="gray.300"
                borderWidth={1}
                _hover={{
                  borderColor: "gray.300",
                }}
                _focus={{
                  borderColor: "gray.300",
                }}
              />
              <InputRightElement width="8" height="full">
                <Button
                  h="8"
                  w="8"
                  minW="unset"
                  size="sm"
                  onClick={getRefinedPromptFn}
                  disabled={!instructions}
                  variant={instructions ? "solid" : "ghost"}
                  mr={4}
                  borderRadius="8"
                  bgColor={instructions ? "orange.400" : "transparent"}
                  colorScheme="orange"
                >
                  {refiningInProgress ? (
                    <Spinner boxSize={4} />
                  ) : (
                    <Icon as={IoMdSend} color={instructions ? "white" : "gray.500"} boxSize={5} />
                  )}
                </Button>
              </InputRightElement>
            </InputGroup>
            <CompareFunctions
              originalFunction={variant.constructFn}
              newFunction={refinedPromptFn}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4} pt={8}>
            <Button
              onClick={replaceVariant}
              minW={24}
              disabled={true}
              _disabled={{
                bgColor: "blue.500",
              }}
            >
              {replacementInProgress ? <Spinner boxSize={4} /> : <Text>Accept</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
