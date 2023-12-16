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
  Collapse,
  Flex,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { BiExport } from "react-icons/bi";

import { useHandledAsyncCallback, useTotalNumLogsSelected } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "../ActionButton";
import InputDropdown from "../InputDropdown";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import InfoCircle from "../InfoCircle";
import { useFilters } from "../Filters/useFilters";
import { LOGGED_CALL_EXPORT_FORMATS } from "~/types/shared.types";

const ExportButton = () => {
  const totalNumLogsSelected = useTotalNumLogsSelected();

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Export"
        icon={BiExport}
        isDisabled={!totalNumLogsSelected}
        requireBeta
      />
      <ExportLogsModal disclosure={disclosure} />
    </>
  );
};

export default ExportButton;

const ExportLogsModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const filters = useFilters().filters;
  const defaultToSelected = useAppStore((s) => s.selectedLogs.defaultToSelected);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const deselectedLogIds = useAppStore((s) => s.selectedLogs.deselectedLogIds);
  const resetLogSelection = useAppStore((s) => s.selectedLogs.resetLogSelection);
  const totalNumLogsSelected = useTotalNumLogsSelected();

  const [selectedExportFormat, setSelectedExportFormat] = useState<
    (typeof LOGGED_CALL_EXPORT_FORMATS)[number]
  >(LOGGED_CALL_EXPORT_FORMATS[0]);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedExportFormat(LOGGED_CALL_EXPORT_FORMATS[0]);
      setRemoveDuplicates(true);
    }
  }, [disclosure.isOpen]);

  const exportLogsMutation = api.loggedCalls.export.useMutation();

  const [exportLogs, exportInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId || !selectedExportFormat) return;
    const response = await exportLogsMutation.mutateAsync({
      projectId: selectedProjectId,
      filters,
      defaultToSelected,
      selectedLogIds: Array.from(selectedLogIds),
      deselectedLogIds: Array.from(deselectedLogIds),
      selectedExportFormat,
      removeDuplicates,
    });

    const dataUrl = `data:application/pdf;base64,${response}`;
    const blob = await fetch(dataUrl).then((res) => res.blob());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `exported.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    disclosure.onClose();
    resetLogSelection();
  }, [
    exportLogsMutation,
    selectedProjectId,
    filters,
    defaultToSelected,
    selectedLogIds,
    deselectedLogIds,
    resetLogSelection,
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
              We'll export the <b>{totalNumLogsSelected.toLocaleString()}</b> logs you have selected
              in the format of your choice.
            </Text>
            <VStack alignItems="flex-start" spacing={4}>
              <Flex
                flexDir={{ base: "column", md: "row" }}
                alignItems={{ base: "flex-start", md: "center" }}
              >
                <HStack w={48} alignItems="center" spacing={1}>
                  <Text fontWeight="bold">Format:</Text>
                  <InfoCircle tooltipText="Format logs for for fine tuning or export them without formatting." />
                </HStack>
                <InputDropdown
                  options={LOGGED_CALL_EXPORT_FORMATS}
                  selectedOption={selectedExportFormat}
                  onSelect={(option) => setSelectedExportFormat(option)}
                  inputGroupProps={{ w: 48 }}
                />
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
            <Button colorScheme="blue" onClick={exportLogs} isLoading={exportInProgress} minW={24}>
              Export
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
