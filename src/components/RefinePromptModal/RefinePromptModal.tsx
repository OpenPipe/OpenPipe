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
  Icon,
  SimpleGrid,
} from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { VscJson } from "react-icons/vsc";
import { TfiThought } from "react-icons/tfi";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";
import { useState } from "react";
import CompareFunctions from "./CompareFunctions";
import { CustomInstructionsInput } from "./CustomInstructionsInput";
import { type RefineOptionLabel, refineOptions } from "./refineOptions";
import { RefineOption } from "./RefineOption";

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

  const [activeRefineOptionLabel, setActiveRefineOptionLabel] = useState<
    RefineOptionLabel | undefined
  >(undefined);

  const [getRefinedPromptFn, refiningInProgress] = useHandledAsyncCallback(
    async (label?: RefineOptionLabel) => {
      if (!variant.experimentId) return;
      const updatedInstructions = label ? refineOptions[label].instructions : instructions;
      setActiveRefineOptionLabel(label);
      await getRefinedPromptMutateAsync({
        id: variant.id,
        instructions: updatedInstructions,
      });
    },
    [getRefinedPromptMutateAsync, onClose, variant, instructions, setActiveRefineOptionLabel],
  );

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
        <ModalHeader>
          <HStack>
            <Icon as={BsStars} />
            <Text>Refine with GPT-4</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <VStack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                <RefineOption
                  label="Convert to function call"
                  activeLabel={activeRefineOptionLabel}
                  icon={VscJson}
                  onClick={getRefinedPromptFn}
                  loading={refiningInProgress}
                />
                <RefineOption
                  label="Add chain of thought"
                  activeLabel={activeRefineOptionLabel}
                  icon={TfiThought}
                  onClick={getRefinedPromptFn}
                  loading={refiningInProgress}
                />
              </SimpleGrid>
              <HStack>
                <Text color="gray.500">or</Text>
              </HStack>
              <CustomInstructionsInput
                instructions={instructions}
                setInstructions={setInstructions}
                loading={refiningInProgress}
                onSubmit={getRefinedPromptFn}
              />
            </VStack>
            <CompareFunctions
              originalFunction={variant.constructFn}
              newFunction={refinedPromptFn}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4}>
            <Button
              onClick={replaceVariant}
              minW={24}
              disabled={replacementInProgress || !refinedPromptFn}
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
