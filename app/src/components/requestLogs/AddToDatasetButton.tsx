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

import { useDatasets, useHandledAsyncCallback } from "~/utils/hooks";
import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";
import ActionButton from "./ActionButton";
import InputDropdown from "../InputDropdown";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { useRouter } from "next/router";

const AddToDatasetButton = () => {
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);

  const disclosure = useDisclosure();

  return (
    <>
      <ActionButton
        onClick={disclosure.onOpen}
        label="Add to Dataset"
        icon={FiPlusSquare}
        isDisabled={selectedLogIds.size === 0}
        requireBeta
      />
      <AddToDatasetModal disclosure={disclosure} />
    </>
  );
};

export default AddToDatasetButton;

const AddToDatasetModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const selectedLogIds = useAppStore((s) => s.selectedLogs.selectedLogIds);
  const clearSelectedLogIds = useAppStore((s) => s.selectedLogs.clearSelectedLogIds);
  const router = useRouter();

  const datasets = useDatasets().data;

  const existingDatasetOptions = useMemo(
    () =>
      datasets?.length
        ? datasets.map((d) => ({ label: d.name, id: d.id }))
        : [{ label: "", id: "" }],
    [datasets],
  );

  const [selectedDatasetOption, setSelectedDatasetOption] = useState(existingDatasetOptions?.[0]);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [createNewDataset, setCreateNewDataset] = useState(false);

  useEffect(() => {
    if (disclosure.isOpen) {
      setSelectedDatasetOption(existingDatasetOptions?.[0]);
      setCreateNewDataset(!existingDatasetOptions?.length);
    }
  }, [disclosure.isOpen, existingDatasetOptions]);

  const createDatasetEntriesMutation = api.datasetEntries.create.useMutation();

  const [addToDataset, addingInProgress] = useHandledAsyncCallback(async () => {
    if (
      !selectedProjectId ||
      !selectedLogIds.size ||
      !(createNewDataset ? newDatasetName : selectedDatasetOption?.id)
    )
      return;
    const datasetParams = createNewDataset
      ? { newDatasetParams: { projectId: selectedProjectId, name: newDatasetName } }
      : { datasetId: selectedDatasetOption?.id };
    const response = await createDatasetEntriesMutation.mutateAsync({
      loggedCallIds: Array.from(selectedLogIds),
      ...datasetParams,
    });

    if (maybeReportError(response)) return;

    const datasetId = response.payload;

    await router.push({ pathname: "/datasets/[id]", query: { id: datasetId } });

    disclosure.onClose();
    clearSelectedLogIds();
  }, [
    selectedProjectId,
    selectedLogIds,
    createNewDataset,
    selectedDatasetOption?.id,
    newDatasetName,
    router,
  ]);

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
            <Text>
              We'll add the <b>{selectedLogIds.size}</b> logs you have selected to the dataset you
              choose.
            </Text>
            <VStack alignItems="flex-start" spacing={4}>
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
                  />
                  <Checkbox
                    isChecked={createNewDataset}
                    onChange={(e) => setCreateNewDataset(e.target.checked)}
                    paddingLeft={4}
                    isDisabled={!existingDatasetOptions?.length}
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
            >
              Add
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
