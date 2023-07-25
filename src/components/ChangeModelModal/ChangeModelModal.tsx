import {
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { type PromptVariant } from "@prisma/client";
import { isObject, isString } from "lodash-es";
import { useState } from "react";
import { RiExchangeFundsFill } from "react-icons/ri";
import { type ProviderModel } from "~/modelProviders/types";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { lookupModel, modelLabel } from "~/utils/utils";
import CompareFunctions from "../RefinePromptModal/CompareFunctions";
import { ModelSearch } from "./ModelSearch";
import { ModelStatsCard } from "./ModelStatsCard";

export const ChangeModelModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const originalModel = lookupModel(variant.modelProvider, variant.model);
  const [selectedModel, setSelectedModel] = useState({
    provider: variant.modelProvider,
    model: variant.model,
  } as ProviderModel);
  const [convertedModel, setConvertedModel] = useState<ProviderModel | undefined>();

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

  const originalLabel = modelLabel(variant.modelProvider, variant.model);
  const selectedLabel = modelLabel(selectedModel.provider, selectedModel.model);
  const convertedLabel =
    convertedModel && modelLabel(convertedModel.provider, convertedModel.model);

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
            {originalLabel !== selectedLabel && (
              <ModelStatsCard
                label="New Model"
                model={lookupModel(selectedModel.provider, selectedModel.model)}
              />
            )}
            <ModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            {isString(modifiedPromptFn) && (
              <CompareFunctions
                originalFunction={variant.constructFn}
                newFunction={modifiedPromptFn}
                leftTitle={originalLabel}
                rightTitle={convertedLabel}
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
              isDisabled={originalLabel === selectedLabel || modificationInProgress}
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
