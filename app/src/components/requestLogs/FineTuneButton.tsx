import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  HStack,
  VStack,
  Icon,
  Text,
  Button,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { FaRobot } from "react-icons/fa";

import { useAppStore } from "~/state/store";
import ActionButton from "./ActionButton";
import InputDropdown from "../InputDropdown";
import { FiChevronDown } from "react-icons/fi";

const SUPPORTED_BASE_MODELS = ["llama2-7b", "llama2-13b", "llama2-70b", "gpt-3.5-turbo"];

const FineTuneButton = () => {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Fine Tune"
        icon={FaRobot}
        isDisabled={selectedLogIds.size === 0}
      />
      <FineTuneModal disclosure={disclosure} />
    </>
  );
};

export default FineTuneButton;

const FineTuneModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const [selectedBaseModel, setSelectedBaseModel] = useState(SUPPORTED_BASE_MODELS[0]);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={FaRobot} />
            <Text>Fine Tune</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={6} pt={4} alignItems="flex-start">
            <Text>We'll train on the logs you've selected.</Text>
            <HStack spacing={2}>
              <Text fontWeight="bold" w={36}>
                Dataset Size:
              </Text>
              <Text>{selectedLogIds.size} logs</Text>
            </HStack>
            <HStack spacing={2}>
              <Text fontWeight="bold" w={36}>
                Base model:
              </Text>
              <InputDropdown
                options={SUPPORTED_BASE_MODELS}
                selectedOption={selectedBaseModel}
                onSelect={(option) => setSelectedBaseModel(option)}
                inputGroupProps={{ w: 48 }}
              />
            </HStack>
            <Button variant="unstyled" colorScheme="gray" color="blue.500">
              <HStack>
                <Text>Advanced Options</Text>
                <Icon as={FiChevronDown} />
              </HStack>
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                console.log("fine tune");
              }}
              minW={24}
              isLoading={false}
            >
              Start Training
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
