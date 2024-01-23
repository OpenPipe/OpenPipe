import {
  Button,
  Checkbox,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import pluralize from "pluralize";
import { useEffect, useState } from "react";
import { BiExport } from "react-icons/bi";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import {
  useHandledAsyncCallback,
  useSelectedProject,
  useTotalNumLogsSelected,
} from "~/utils/hooks";
import ActionButton from "../ActionButton";
import { useFilters } from "../Filters/useFilters";
import InfoCircle from "../InfoCircle";

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
      />
      <ExportLogsModal disclosure={disclosure} />
    </>
  );
};

export default ExportButton;

const ExportLogsModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProjectId = useSelectedProject().data?.id;
  const filters = useFilters().filters;
  const defaultToSelected = useAppStore((s) => s.selectedLogs.defaultToSelected);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const deselectedLogIds = useAppStore((s) => s.selectedLogs.deselectedLogIds);
  const resetLogSelection = useAppStore((s) => s.selectedLogs.resetLogSelection);
  const totalNumLogsSelected = useTotalNumLogsSelected();

  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [excludeErrors, setExcludeErrors] = useState(true);

  useEffect(() => {
    if (disclosure.isOpen) {
      setRemoveDuplicates(true);
      setExcludeErrors(true);
    }
  }, [disclosure.isOpen]);

  const exportLogsMutation = api.loggedCalls.export.useMutation();

  const [exportLogs, exportInProgress] = useHandledAsyncCallback(async () => {
    if (!selectedProjectId) return;
    const response = await exportLogsMutation.mutateAsync({
      projectId: selectedProjectId,
      filters,
      defaultToSelected,
      selectedLogIds: Array.from(selectedLogIds),
      deselectedLogIds: Array.from(deselectedLogIds),
      removeDuplicates,
      excludeErrors,
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
    removeDuplicates,
    excludeErrors,
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
              We'll export the <b>{totalNumLogsSelected.toLocaleString()}</b>{" "}
              {pluralize("log", totalNumLogsSelected)} you have selected, including any associated
              tags.
            </Text>
            <VStack alignItems="flex-start" spacing={0}>
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
              <VStack align="stretch" pt={4}>
                <HStack>
                  <Checkbox
                    colorScheme="blue"
                    isChecked={excludeErrors}
                    onChange={(e) => setExcludeErrors(e.target.checked)}
                  >
                    <Text>Exclude errored logs</Text>
                  </Checkbox>
                  <InfoCircle tooltipText="Exclude logs with status codes other than 200." />
                </HStack>
              </VStack>
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
