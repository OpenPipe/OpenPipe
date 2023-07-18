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
} from "@chakra-ui/react";
import { useState } from "react";
import { type SupportedModel } from "~/server/types";
import { ModelStatsCard } from "./ModelStatsCard";
import { SelectModelSearch } from "./SelectModelSearch";

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

  return (
    <Modal isOpen onClose={onClose} size={{base: "xl", sm: '2xl', md: "3xl"}}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>Select a New Model</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={4}>
            {originalModel !== selectedModel && <ModelStatsCard label="ORIGINAL MODEL" model={originalModel} />}
            <ModelStatsCard label="SELECTED MODEL" model={selectedModel} />
            <SelectModelSearch selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue">Continue</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
