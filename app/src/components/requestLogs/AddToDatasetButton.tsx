import { useState, useEffect, useMemo } from "react";
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
  Flex,
  Input,
  useDisclosure,
  type UseDisclosureReturn,
  Checkbox,
} from "@chakra-ui/react";
import { FiPlusSquare } from "react-icons/fi";

import {
  useDatasets,
  useHandledAsyncCallback,
  useSelectedProject,
  useTotalNumLogsSelected,
} from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "../ActionButton";
import InputDropdown from "../InputDropdown";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useRouter } from "next/router";
import { useFilters, constructFiltersQueryParams } from "../Filters/useFilters";
import { DATASET_GENERAL_TAB_KEY } from "../datasets/DatasetContentTabs/DatasetContentTabs";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { useDateFilter } from "../Filters/useDateFilter";

const AddToDatasetButton = () => {
  const totalNumLogsSelected = useTotalNumLogsSelected();

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Add to Dataset"
        icon={FiPlusSquare}
        isDisabled={!totalNumLogsSelected}
      />
      <AddToDatasetModal disclosure={disclosure} />
    </>
  );
};

export default AddToDatasetButton;

const AddToDatasetModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProject = useSelectedProject().data;
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const deselectedLogIds = useAppStore((s) => s.selectedLogs.deselectedLogIds);
  const defaultToSelected = useAppStore((s) => s.selectedLogs.defaultToSelected);
  const resetLogSelection = useAppStore((s) => s.selectedLogs.resetLogSelection);
  const dateFilters = useDateFilter().filters;
  const filters = useFilters().filters;

  const totalNumLogsSelected = useTotalNumLogsSelected();
  const maxSampleSize = Math.min(totalNumLogsSelected, 20000);

  const router = useRouter();

  const datasets = useDatasets().data;

  const existingDatasetOptions = useMemo(
    () =>
      datasets?.length
        ? datasets.map((d) => ({ label: d.name, id: d.id }))
        : [{ label: "", id: "" }],
    [datasets],
  );

  // Initialize to valid number to avoid invalid input border flash on first render
  const [sampleSize, setSampleSize] = useState(1);
  const [selectedDatasetOption, setSelectedDatasetOption] = useState(existingDatasetOptions?.[0]);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [createNewDataset, setCreateNewDataset] = useState(false);

  useEffect(() => {
    if (disclosure.isOpen) {
      setSampleSize(maxSampleSize);
      setSelectedDatasetOption(existingDatasetOptions?.[0]);
      setCreateNewDataset(!existingDatasetOptions[0]?.id);
    }
  }, [disclosure.isOpen, existingDatasetOptions, maxSampleSize]);

  const createDatasetEntriesMutation = api.nodeEntries.createFromLoggedCalls.useMutation();

  const [addToDataset, addingInProgress] = useHandledAsyncCallback(async () => {
    if (
      !selectedProject ||
      !totalNumLogsSelected ||
      !(createNewDataset ? newDatasetName : selectedDatasetOption?.id)
    )
      return;
    const datasetParams = createNewDataset
      ? { newDatasetParams: { projectId: selectedProject.id, name: newDatasetName } }
      : { datasetId: selectedDatasetOption?.id };
    const response = await createDatasetEntriesMutation.mutateAsync({
      selectedLogIds: Array.from(selectedLogIds),
      deselectedLogIds: Array.from(deselectedLogIds),
      defaultToSelected,
      sampleSize,
      filters: [...dateFilters, ...filters],
      ...datasetParams,
    });

    if (maybeReportError(response)) return;

    const { datasetId, archiveNodeId } = response.payload;

    const filtersQueryParams = constructFiltersQueryParams({
      filters: [
        {
          id: Date.now().toString(),
          field: GeneralFiltersDefaultFields.Source,
          comparator: "=",
          value: archiveNodeId,
        },
      ],
    });

    await router.push({
      pathname: "/p/[projectSlug]/datasets/[id]/[tab]",
      query: {
        projectSlug: selectedProject.slug,
        id: datasetId,
        tab: DATASET_GENERAL_TAB_KEY,
        ...filtersQueryParams,
      },
    });

    disclosure.onClose();
    resetLogSelection();
  }, [
    selectedProject,
    selectedLogIds,
    deselectedLogIds,
    defaultToSelected,
    totalNumLogsSelected,
    resetLogSelection,
    sampleSize,
    createNewDataset,
    selectedDatasetOption?.id,
    newDatasetName,
    router,
  ]);

  const sampleSizeInvalid = sampleSize > maxSampleSize || sampleSize <= 0;

  return (
    <Modal size={{ base: "xl", md: "2xl" }} {...disclosure}>
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={FiPlusSquare} />
            <Text>Add to Dataset</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack w="full" spacing={8} pt={4} alignItems="flex-start">
            <VStack alignItems="flex-start" spacing={4}>
              <Flex
                flexDir={{ base: "column", md: "row" }}
                alignItems={{ base: "flex-start", md: "center" }}
              >
                <Text fontWeight="bold" w={48}>
                  Sample Size:
                </Text>
                <Input
                  w={48}
                  type="number"
                  value={sampleSize}
                  onChange={(e) =>
                    setSampleSize(parseInt(e.target.value.replace(/[^\d]/g, "") || "1"))
                  }
                  isInvalid={sampleSizeInvalid}
                />
              </Flex>
              {existingDatasetOptions?.length && selectedDatasetOption && (
                <Flex
                  flexDir={{ base: "column", md: "row" }}
                  alignItems={{ base: "flex-start", md: "center" }}
                >
                  <Text fontWeight="bold" w={48}>
                    Dataset:
                  </Text>
                  <InputDropdown
                    options={existingDatasetOptions}
                    selectedOption={selectedDatasetOption}
                    getDisplayLabel={(option) => option.label}
                    onSelect={(option) => setSelectedDatasetOption(option)}
                    inputGroupProps={{ w: 48 }}
                    isDisabled={createNewDataset}
                    maxPopoverContentHeight={400}
                    minItemHeight={10}
                  />
                  <Checkbox
                    isChecked={createNewDataset}
                    onChange={(e) => setCreateNewDataset(e.target.checked)}
                    paddingLeft={4}
                    isDisabled={!existingDatasetOptions[0]?.id}
                  >
                    <Text>Create New Dataset</Text>
                  </Checkbox>
                </Flex>
              )}

              {createNewDataset && (
                <Flex
                  flexDir={{ base: "column", md: "row" }}
                  alignItems={{ base: "flex-start", md: "center" }}
                >
                  <Text w={48} fontWeight="bold">
                    Dataset Name:
                  </Text>
                  <Input
                    w={48}
                    value={newDatasetName}
                    onChange={(e) => setNewDatasetName(e.target.value)}
                  />
                </Flex>
              )}
            </VStack>
            {sampleSizeInvalid && (
              <Text color="red.500">
                Sample size must be less than or equal to <b>{maxSampleSize.toLocaleString()}</b>.
              </Text>
            )}
            <Text>
              {sampleSize < totalNumLogsSelected ? (
                <>
                  <b>
                    {sampleSize.toLocaleString()}/{totalNumLogsSelected.toLocaleString()}
                  </b>{" "}
                  randomly chosen
                </>
              ) : (
                <b>{totalNumLogsSelected.toLocaleString()}</b>
              )}{" "}
              request logs will be added to{" "}
              {createNewDataset ? "your new dataset" : <b>{selectedDatasetOption?.label}</b>}.
            </Text>
            <Text fontStyle="italic">
              Only logs with a successful response will be included in the dataset.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={addToDataset}
              isLoading={addingInProgress}
              minW={24}
              isDisabled={sampleSizeInvalid}
            >
              Add
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
