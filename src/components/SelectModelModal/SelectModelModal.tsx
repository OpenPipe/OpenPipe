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
} from "@chakra-ui/react";
import { useState } from "react";
import { type SupportedModel } from "~/server/types";
import { ModelStatsCard } from "./ModelStatsCard";
import { SelectModelSearch } from "./SelectModelSearch";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

export const SelectModelModal = ({
  originalModel,
  variantId,
  onClose,
}: {
  originalModel: SupportedModel;
  variantId: string;
  onClose: () => void;
}) => {
  const [selectedModel, setSelectedModel] = useState<SupportedModel>(originalModel);
  const utils = api.useContext();

  const experiment = useExperiment();

  const duplicateMutation = api.promptVariants.create.useMutation();

  const [createNewVariant, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!experiment?.data?.id) return;
    await duplicateMutation.mutateAsync({
      experimentId: experiment?.data?.id,
      variantId,
      newModel: selectedModel,
    });
    await utils.promptVariants.list.invalidate();
    onClose();
  }, [duplicateMutation, experiment?.data?.id, variantId, onClose]);

  return (
    <Modal isOpen onClose={onClose} size={{ base: "xl", sm: "2xl", md: "3xl" }}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>Select a New Model</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <ModelStatsCard label="Original Model" model={originalModel} />
            {originalModel !== selectedModel && (
              <ModelStatsCard label="New Model" model={selectedModel} />
            )}
            <SelectModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            onClick={createNewVariant}
            minW={24}
            disabled={originalModel === selectedModel}
          >
            {creationInProgress ? <Spinner boxSize={4} /> : <Text>Continue</Text>}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
