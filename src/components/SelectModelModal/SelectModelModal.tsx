import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { useState } from "react";
import { type SupportedModel } from "~/server/types";
import { SelectedModelInfo } from "./SelectedModelInfo";

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
    <Modal isOpen onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>Browse Models</ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <SelectedModelInfo model={selectedModel} />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue">Continue</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
