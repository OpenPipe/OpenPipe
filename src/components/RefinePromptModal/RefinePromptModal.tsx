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
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";
import { useState } from "react";
import CompareFunctions from "./CompareFunctions";
import { CustomInstructionsInput } from "./CustomInstructionsInput";
import { type RefineOptionInfo, refineOptions } from "./refineOptions";
import { RefineOption } from "./RefineOption";
import { isObject, isString } from "lodash-es";
import { type SupportedProvider } from "~/modelProviders/types";

export const RefinePromptModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const utils = api.useContext();

  const providerRefineOptions = refineOptions[variant.modelProvider as SupportedProvider];

  const { mutateAsync: getModifiedPromptMutateAsync, data: refinedPromptFn } =
    api.promptVariants.getModifiedPromptFn.useMutation();
  const [instructions, setInstructions] = useState<string>("");

  const [activeRefineOptionLabel, setActiveRefineOptionLabel] = useState<string | undefined>(
    undefined,
  );

  const [getModifiedPromptFn, modificationInProgress] = useHandledAsyncCallback(
    async (label?: string) => {
      if (!variant.experimentId) return;
      const updatedInstructions = label
        ? (providerRefineOptions[label] as RefineOptionInfo).instructions
        : instructions;
      setActiveRefineOptionLabel(label);
      await getModifiedPromptMutateAsync({
        id: variant.id,
        instructions: updatedInstructions,
      });
    },
    [getModifiedPromptMutateAsync, onClose, variant, instructions, setActiveRefineOptionLabel],
  );

  const replaceVariantMutation = api.promptVariants.replaceVariant.useMutation();

  const [replaceVariant, replacementInProgress] = useHandledAsyncCallback(async () => {
    if (
      !variant.experimentId ||
      !refinedPromptFn ||
      (isObject(refinedPromptFn) && "status" in refinedPromptFn)
    )
      return;
    await replaceVariantMutation.mutateAsync({
      id: variant.id,
      constructFn: refinedPromptFn,
    });
    await utils.promptVariants.list.invalidate();
    onClose();
  }, [replaceVariantMutation, variant, onClose, refinedPromptFn]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size={{ base: "xl", sm: "2xl", md: "3xl", lg: "5xl", xl: "7xl" }}
    >
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
              {Object.keys(providerRefineOptions).length && (
                <>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                    {Object.keys(providerRefineOptions).map((label) => (
                      <RefineOption
                        key={label}
                        label={label}
                        icon={providerRefineOptions[label]!.icon}
                        desciption={providerRefineOptions[label]!.description}
                        activeLabel={activeRefineOptionLabel}
                        onClick={getModifiedPromptFn}
                        loading={modificationInProgress}
                      />
                    ))}
                  </SimpleGrid>
                  <Text color="gray.500">or</Text>
                </>
              )}
              <CustomInstructionsInput
                instructions={instructions}
                setInstructions={setInstructions}
                loading={modificationInProgress}
                onSubmit={getModifiedPromptFn}
              />
            </VStack>
            <CompareFunctions
              originalFunction={variant.constructFn}
              newFunction={isString(refinedPromptFn) ? refinedPromptFn : undefined}
              maxH="40vh"
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4}>
            <Button
              colorScheme="blue"
              onClick={replaceVariant}
              minW={24}
              isDisabled={replacementInProgress || !refinedPromptFn}
            >
              {replacementInProgress ? <Spinner boxSize={4} /> : <Text>Accept</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
