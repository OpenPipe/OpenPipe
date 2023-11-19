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
  Collapse,
  Flex,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { AiOutlineDownload } from "react-icons/ai";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

import { useHandledAsyncCallback, useDataset } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "~/components/ActionButton";
import InfoCircle from "~/components/InfoCircle";

const ExportButton = () => {
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Download"
        icon={AiOutlineDownload}
        isDisabled={selectedIds.size === 0}
        requireBeta
      />
      <ExportDatasetEntriesModal disclosure={disclosure} />
    </>
  );
};

export default ExportButton;

const ExportDatasetEntriesModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const dataset = useDataset().data;
  const selectedIds = useAppStore((s) => s.selectedDatasetEntries.selectedIds);
  const clearSelectedIds = useAppStore((s) => s.selectedDatasetEntries.clearSelectedIds);

  const [testingSplit, setTestingSplit] = useState(10);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (disclosure.isOpen) {
      setTestingSplit(10);
      setRemoveDuplicates(false);
    }
  }, [disclosure.isOpen]);

  const exportDataMutation = api.datasetEntries.export.useMutation();

  const [exportData, exportInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset?.id || !selectedIds.size || !testingSplit) return;
    const response = await exportDataMutation.mutateAsync({
      datasetId: dataset.id,
      datasetEntryIds: Array.from(selectedIds),
      testingSplit,
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
    clearSelectedIds();
  }, [exportDataMutation, dataset, selectedIds, testingSplit, removeDuplicates]);

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={AiOutlineDownload} />
            <Text>Export Logs</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <Text>
              We'll export the <b>{selectedIds.size.toLocaleString()}</b> rows you have selected in
              the OpenAI training format.
            </Text>
            <VStack alignItems="flex-start" spacing={4}>
              <Flex
                flexDir={{ base: "column", md: "row" }}
                alignItems={{ base: "flex-start", md: "center" }}
              >
                <HStack w={48} alignItems="center" spacing={1}>
                  <Text fontWeight="bold">Testing Split:</Text>
                  <InfoCircle tooltipText="The percent of your logs that will be reserved for testing and saved in another file. Logs are split randomly." />
                </HStack>
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
              </Flex>
            </VStack>
            <VStack alignItems="flex-start" spacing={0}>
              <Button
                variant="unstyled"
                color="blue.600"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <HStack>
                  <Text>Advanced Options</Text>
                  <Icon as={showAdvancedOptions ? FiChevronUp : FiChevronDown} />
                </HStack>
              </Button>
              <Collapse in={showAdvancedOptions} unmountOnExit={true}>
                <VStack align="stretch" pt={4}>
                  <HStack>
                    <Checkbox
                      colorScheme="blue"
                      isChecked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    >
                      <Text>Remove duplicates</Text>
                    </Checkbox>
                    <InfoCircle tooltipText="To avoid overfitting and speed up training, automatically deduplicate logs with matching input and output." />
                  </HStack>
                </VStack>
              </Collapse>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={exportData} isLoading={exportInProgress} minW={24}>
              Download
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
