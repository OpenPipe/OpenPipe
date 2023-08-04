import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalFooter,
  Text,
  HStack,
  VStack,
  Icon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
} from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { useState } from "react";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";

export const GenerateDataModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const utils = api.useContext();

  const datasetId = useDataset().data?.id;

  const [numToGenerate, setNumToGenerate] = useState<number>(20);
  const [inputDescription, setInputDescription] = useState<string>(
    "Each input should contain an email body. Half of the emails should contain event details, and the other half should not.",
  );
  const [outputDescription, setOutputDescription] = useState<string>(
    `Each output should contain "true" or "false", where "true" indicates that the email contains event details.`,
  );

  const generateEntriesMutation = api.datasetEntries.autogenerateEntries.useMutation();

  const [generateEntries, generateEntriesInProgress] = useHandledAsyncCallback(async () => {
    if (!inputDescription || !outputDescription || !numToGenerate || !datasetId) return;
    await generateEntriesMutation.mutateAsync({
      datasetId,
      inputDescription,
      outputDescription,
      numToGenerate,
    });
    await utils.datasetEntries.list.invalidate();
    onClose();
  }, [
    generateEntriesMutation,
    onClose,
    inputDescription,
    outputDescription,
    numToGenerate,
    datasetId,
  ]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "xl", sm: "2xl", md: "3xl" }}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={BsStars} />
            <Text>Generate Data</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} padding={8} alignItems="flex-start">
            <VStack alignItems="flex-start" spacing={2}>
              <Text fontWeight="bold">Number of Rows:</Text>
              <NumberInput
                step={5}
                defaultValue={15}
                min={0}
                max={100}
                onChange={(valueString) => setNumToGenerate(parseInt(valueString) || 0)}
                value={numToGenerate}
                w="24"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </VStack>
            <VStack alignItems="flex-start" w="full" spacing={2}>
              <Text fontWeight="bold">Input Description:</Text>
              <AutoResizeTextArea
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                placeholder="Each input should contain..."
              />
            </VStack>
            <VStack alignItems="flex-start" w="full" spacing={2}>
              <Text fontWeight="bold">Output Description (optional):</Text>
              <AutoResizeTextArea
                value={outputDescription}
                onChange={(e) => setOutputDescription(e.target.value)}
                placeholder="The output should contain..."
              />
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            isLoading={generateEntriesInProgress}
            isDisabled={!numToGenerate || !inputDescription || !outputDescription}
            onClick={generateEntries}
          >
            Generate
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
