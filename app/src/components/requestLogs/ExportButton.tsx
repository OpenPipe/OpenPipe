import { useState, useEffect } from "react";
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
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { BiExport } from "react-icons/bi";

import { useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "./ActionButton";
import InputDropdown from "../InputDropdown";
import { FiChevronDown } from "react-icons/fi";

const SUPPORTED_EXPORT_FORMATS = ["alpaca-finetune", "openai-fine-tune", "unformatted"];

const ExportButton = () => {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Export"
        icon={BiExport}
        isDisabled={selectedLogIds.size === 0}
      />
      <ExportLogsModal disclosure={disclosure} />
    </>
  );
};

export default ExportButton;

const ExportLogsModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const clearSelectedLogIds = useAppStore((s) => s.selectedLogs.clearSelectedLogIds);

  const [selectedExportFormat, setSelectedExportFormat] = useState(SUPPORTED_EXPORT_FORMATS[0]);
  const [testingSplit, setTestingSplit] = useState(10);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedExportFormat(SUPPORTED_EXPORT_FORMATS[0]);
      setTestingSplit(10);
      setRemoveDuplicates(true);
    }
  }, [disclosure.isOpen]);

  const exportLogsMutation = api.loggedCalls.export.useMutation();

  const [exportLogs, exportInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId || !selectedLogIds.size || !testingSplit || !selectedExportFormat)
      return;
    const response = await exportLogsMutation.mutateAsync({
      projectId: selectedProjectId,
      selectedLogIds: Array.from(selectedLogIds),
      testingSplit,
      selectedExportFormat,
      removeDuplicates,
    });

    const dataUrl = `data:application/pdf;base64,${response}`;
    const blob = await fetch(dataUrl).then((res) => res.blob());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `data.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    disclosure.onClose();
    clearSelectedLogIds();
  }, [
    exportLogsMutation,
    selectedProjectId,
    selectedLogIds,
    testingSplit,
    selectedExportFormat,
    removeDuplicates,
  ]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={BiExport} />
            <Text>Export Logs</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <Text>
              We'll export the <b>{selectedLogIds.size}</b> logs you have selected in the format of
              your choice.
            </Text>
            <Checkbox
              colorScheme="blue"
              isChecked={removeDuplicates}
              onChange={(e) => setRemoveDuplicates(e.target.checked)}
            >
              <Text>Remove duplicates? (recommended)</Text>
            </Checkbox>
            <VStack alignItems="flex-start" spacing={4}>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={48}>
                  Format:
                </Text>
                <InputDropdown
                  options={SUPPORTED_EXPORT_FORMATS}
                  selectedOption={selectedExportFormat}
                  onSelect={(option) => setSelectedExportFormat(option)}
                  inputGroupProps={{ w: 48 }}
                />
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold" w={48}>
                  Testing Split:
                </Text>
                <HStack>
                  <NumberInput
                    defaultValue={10}
                    onChange={(_, num) => setTestingSplit(num)}
                    min={1}
                    max={100}
                    w={48}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
              </HStack>
            </VStack>
            <Button variant="unstyled" color="blue.600">
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
            <Button colorScheme="blue" onClick={exportLogs} isLoading={exportInProgress} minW={24}>
              Export
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
