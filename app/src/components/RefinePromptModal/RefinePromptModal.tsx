import { useState, useMemo, useCallback } from "react";
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
  HStack,
  Icon,
  SimpleGrid,
} from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { type PromptVariant } from "@prisma/client";

import CompareFunctions from "./CompareFunctions";
import { CustomInstructionsInput } from "../CustomInstructionsInput";
import { RefineAction } from "./RefineAction";
import { isString } from "lodash-es";
import { type RefinementAction, type SupportedProvider } from "~/modelProviders/types";
import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { useAppStore } from "~/state/store";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export const RefinePromptModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const editorOptionsMap = useAppStore((s) => s.sharedVariantEditor.editorOptionsMap);
  const originalPromptFn = useMemo(
    () => editorOptionsMap[variant.uiId]?.getContent() || "",
    [editorOptionsMap, variant.uiId],
  );

  const refinementActions =
    frontendModelProviders[variant.modelProvider as SupportedProvider].refinementActions || {};

  const { mutateAsync: getModifiedPromptMutateAsync } =
    api.promptVariants.getModifiedPromptFn.useMutation();
  const [instructions, setInstructions] = useState<string>("");

  const [activeRefineActionLabel, setActiveRefineActionLabel] = useState<string | undefined>(
    undefined,
  );
  const [refinedPromptFn, setRefinedPromptFn] = useState<string>();

  const [getModifiedPromptFn, modificationInProgress] = useHandledAsyncCallback(
    async (label?: string) => {
      if (!variant.experimentId) return;
      const updatedInstructions = label
        ? (refinementActions[label] as RefinementAction).instructions
        : instructions;
      setActiveRefineActionLabel(label);
      const resp = await getModifiedPromptMutateAsync({
        id: variant.id,
        originalPromptFn,
        instructions: updatedInstructions,
      });
      if (maybeReportError(resp)) return;
      setRefinedPromptFn(resp.payload);
    },
    [getModifiedPromptMutateAsync, onClose, variant, instructions, setActiveRefineActionLabel],
  );

  const replaceVariant = useCallback(() => {
    if (!refinedPromptFn) return;
    editorOptionsMap[variant.uiId]?.setContent(refinedPromptFn);
    onClose();
  }, [variant.uiId, editorOptionsMap, onClose, refinedPromptFn]);

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
            <VStack spacing={4} w="full">
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
                onSubmit={() => getModifiedPromptFn()}
              />
            </VStack>
            <CompareFunctions
              originalFunction={originalPromptFn}
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
              isDisabled={!refinedPromptFn}
            >
              Accept
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
