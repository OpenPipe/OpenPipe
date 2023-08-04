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
} from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { useState } from "react";
import { CustomInstructionsInput } from "~/components/CustomInstructionsInput";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";

export const GenerateDataModal = ({ onClose }: { onClose: () => void }) => {
  const utils = api.useContext();

  const datasetId = useDataset().data?.id;
  const [instructions, setInstructions] = useState<string>("");
  const [numToGenerate, setNumToGenerate] = useState<number>(20);

  const generateInputsMutation = api.datasetEntries.autogenerateInputs.useMutation();

  const [generateEntries, generateEntriesInProgress] = useHandledAsyncCallback(async () => {
    if (!instructions || !numToGenerate || !datasetId) return;
    await generateInputsMutation.mutateAsync({
      datasetId,
      instructions,
      numToGenerate,
    });
    await utils.datasetEntries.list.invalidate();
    onClose();
  }, [generateInputsMutation, onClose, instructions, numToGenerate, datasetId]);

  return (
    <Modal isOpen onClose={onClose} size={{ base: "xl", sm: "2xl", md: "3xl" }}>
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
              <Text fontWeight="bold">Row Description:</Text>
              <CustomInstructionsInput
                instructions={instructions}
                setInstructions={setInstructions}
                onSubmit={generateEntries}
                loading={generateEntriesInProgress}
                placeholder="Each row should contain..."
              />
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter />
      </ModalContent>
    </Modal>
  );
};
