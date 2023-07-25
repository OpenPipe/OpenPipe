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
import { useHandledAsyncCallback, useVisibleScenarioIds } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";
import { useState } from "react";
import CompareFunctions from "./CompareFunctions";
import { CustomInstructionsInput } from "./CustomInstructionsInput";
import { RefineAction } from "./RefineAction";
import { isObject, isString } from "lodash-es";
import { type RefinementAction, type SupportedProvider } from "~/modelProviders/types";
import frontendModelProviders from "~/modelProviders/frontendModelProviders";

export const RefinePromptModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const utils = api.useContext();
  const visibleScenarios = useVisibleScenarioIds();

  const refinementActions =
    frontendModelProviders[variant.modelProvider as SupportedProvider].refinementActions || {};

  const { mutateAsync: getModifiedPromptMutateAsync, data: refinedPromptFn } =
    api.promptVariants.getModifiedPromptFn.useMutation();
  const [instructions, setInstructions] = useState<string>("");

  const [activeRefineActionLabel, setActiveRefineActionLabel] = useState<string | undefined>(
    undefined,
  );

  const [getModifiedPromptFn, modificationInProgress] = useHandledAsyncCallback(
    async (label?: string) => {
      if (!variant.experimentId) return;
      const updatedInstructions = label
        ? (refinementActions[label] as RefinementAction).instructions
        : instructions;
      setActiveRefineActionLabel(label);
      await getModifiedPromptMutateAsync({
        id: variant.id,
        instructions: updatedInstructions,
      });
    },
    [getModifiedPromptMutateAsync, onClose, variant, instructions, setActiveRefineActionLabel],
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
      streamScenarios: visibleScenarios,
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
              {Object.keys(refinementActions).length && (
                <>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                    {Object.keys(refinementActions).map((label) => (
                      <RefineAction
                        key={label}
                        label={label}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        icon={refinementActions[label]!.icon}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        desciption={refinementActions[label]!.description}
                        activeLabel={activeRefineActionLabel}
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
