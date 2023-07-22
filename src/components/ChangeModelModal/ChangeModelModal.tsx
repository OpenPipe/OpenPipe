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
} from "@chakra-ui/react";
import { RiExchangeFundsFill } from "react-icons/ri";
import { useState } from "react";
import { ModelStatsCard } from "./ModelStatsCard";
import { ModelSearch } from "./ModelSearch";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import CompareFunctions from "../RefinePromptModal/CompareFunctions";
import { type PromptVariant } from "@prisma/client";
import { isObject, isString } from "lodash-es";
import { type Model, type SupportedProvider } from "~/modelProviders/types";
import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { keyForModel } from "~/utils/utils";

export const ChangeModelModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const originalModelProviderName = variant.modelProvider as SupportedProvider;
  const originalModelProvider = frontendModelProviders[originalModelProviderName];
  const originalModel = originalModelProvider.models[variant.model] as Model;
  const [selectedModel, setSelectedModel] = useState<Model>(originalModel);
  const [convertedModel, setConvertedModel] = useState<Model | undefined>(undefined);
  const utils = api.useContext();

  const experiment = useExperiment();

  const { mutateAsync: getModifiedPromptMutateAsync, data: modifiedPromptFn } =
    api.promptVariants.getModifiedPromptFn.useMutation();

  const [getModifiedPromptFn, modificationInProgress] = useHandledAsyncCallback(async () => {
    if (!experiment) return;

    await getModifiedPromptMutateAsync({
      id: variant.id,
      newModel: selectedModel,
    });
    setConvertedModel(selectedModel);
  }, [getModifiedPromptMutateAsync, onClose, experiment, variant, selectedModel]);

  const replaceVariantMutation = api.promptVariants.replaceVariant.useMutation();

  const [replaceVariant, replacementInProgress] = useHandledAsyncCallback(async () => {
    if (
      !variant.experimentId ||
      !modifiedPromptFn ||
      (isObject(modifiedPromptFn) && "status" in modifiedPromptFn)
    )
      return;
    await replaceVariantMutation.mutateAsync({
      id: variant.id,
      constructFn: modifiedPromptFn,
    });
    await utils.promptVariants.list.invalidate();
    onClose();
  }, [replaceVariantMutation, variant, onClose, modifiedPromptFn]);

  const originalModelLabel = keyForModel(originalModel);
  const selectedModelLabel = keyForModel(selectedModel);
  const convertedModelLabel = convertedModel ? keyForModel(convertedModel) : undefined;

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
            <Icon as={RiExchangeFundsFill} />
            <Text>Change Model</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <ModelStatsCard label="Original Model" model={originalModel} />
            {originalModelLabel !== selectedModelLabel && (
              <ModelStatsCard label="New Model" model={selectedModel} />
            )}
            <ModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            {isString(modifiedPromptFn) && (
              <CompareFunctions
                originalFunction={variant.constructFn}
                newFunction={modifiedPromptFn}
                leftTitle={originalModelLabel}
                rightTitle={convertedModelLabel}
              />
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button
              colorScheme="gray"
              onClick={getModifiedPromptFn}
              minW={24}
              isDisabled={originalModel === selectedModel || modificationInProgress}
            >
              {modificationInProgress ? <Spinner boxSize={4} /> : <Text>Convert</Text>}
            </Button>
            <Button
              colorScheme="blue"
              onClick={replaceVariant}
              minW={24}
              isDisabled={!convertedModel || modificationInProgress || replacementInProgress}
            >
              {replacementInProgress ? <Spinner boxSize={4} /> : <Text>Accept</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
