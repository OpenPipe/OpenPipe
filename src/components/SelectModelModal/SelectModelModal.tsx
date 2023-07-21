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
import { type SupportedModel } from "~/server/types";
import { ModelStatsCard } from "./ModelStatsCard";
import { SelectModelSearch } from "./SelectModelSearch";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import CompareFunctions from "../RefinePromptModal/CompareFunctions";
import { type PromptVariant } from "@prisma/client";
import { isObject, isString } from "lodash-es";

export const SelectModelModal = ({
  variant,
  onClose,
}: {
  variant: PromptVariant;
  onClose: () => void;
}) => {
  const originalModel = variant.model as SupportedModel;
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(originalModel);
  const [convertedModel, setConvertedModel] = useState<SupportedModel | undefined>(undefined);
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
            {originalModel !== selectedModel && (
              <ModelStatsCard label="New Model" model={selectedModel} />
            )}
            <SelectModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            {isString(modifiedPromptFn) && (
              <CompareFunctions
                originalFunction={variant.constructFn}
                newFunction={modifiedPromptFn}
                leftTitle={originalModel}
                rightTitle={convertedModel}
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
              disabled={originalModel === selectedModel || modificationInProgress}
            >
              {modificationInProgress ? <Spinner boxSize={4} /> : <Text>Convert</Text>}
            </Button>
            <Button
              colorScheme="blue"
              onClick={replaceVariant}
              minW={24}
              disabled={!convertedModel || replacementInProgress}
              _disabled={{ bg: "blue.100", cursor: "not-allowed" }}
            >
              {replacementInProgress ? <Spinner boxSize={4} /> : <Text>Accept</Text>}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
