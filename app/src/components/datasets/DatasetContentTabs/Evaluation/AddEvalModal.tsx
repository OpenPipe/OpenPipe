import { useState, useEffect, useMemo } from "react";
import {
  Button,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  Link as ChakraLink,
  type UseDisclosureReturn,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import Link from "next/link";

import { api } from "~/utils/api";
import {
  useDataset,
  useDatasetEntries,
  useHandledAsyncCallback,
  useSelectedProject,
} from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { useVisibleEvalIds } from "./useVisibleEvalIds";
import { useFilters } from "~/components/Filters/useFilters";
import { EvaluationFiltersDefaultFields } from "~/types/shared.types";
import { getOutputTitle } from "./getOutputTitle";

const AddEvalModal = ({ disclosure }: { disclosure: UseDisclosureReturn }) => {
  const mutation = api.datasetEvals.create.useMutation();
  const utils = api.useContext();

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const dataset = useDataset().data;
  const testingCount = useDatasetEntries().data?.testingCount;

  const modelOptions = useMemo(() => {
    const options = [
      {
        id: ORIGINAL_MODEL_ID,
        name: getOutputTitle(ORIGINAL_MODEL_ID) ?? "",
      },
    ];
    if (!dataset) return options;
    return [
      ...options,
      ...dataset.enabledComparisonModels.map((comparisonModelId) => ({
        id: comparisonModelId,
        name: getOutputTitle(comparisonModelId) ?? "",
      })),
      ...dataset.deployedFineTunes.map((model) => ({
        id: model.id,
        name: getOutputTitle(model.id, model.slug) ?? "",
      })),
    ];
  }, [dataset]);

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [numDatasetEntries, setNumDatasetEntries] = useState(0);
  const [includedModelIds, setIncludedModelIds] = useState<string[]>([]);

  useEffect(() => {
    if (disclosure.isOpen) {
      setName("");
      setInstructions("");
      setNumDatasetEntries(Math.min(10, testingCount || 0));
      setIncludedModelIds([ORIGINAL_MODEL_ID]);
    }
  }, [
    disclosure.isOpen,
    setName,
    setInstructions,
    setNumDatasetEntries,
    setIncludedModelIds,
    testingCount,
  ]);

  const ensureEvalShown = useVisibleEvalIds().ensureEvalShown;
  const addFilter = useFilters().addFilter;

  const [onCreationConfirm, creationInProgress] = useHandledAsyncCallback(async () => {
    if (!dataset?.id || !name || !instructions || !numDatasetEntries || includedModelIds.length < 2)
      return;
    const resp = await mutation.mutateAsync({
      datasetId: dataset.id,
      name,
      instructions,
      numDatasetEntries,
      modelIds: includedModelIds,
    });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasetEntries.testingStats.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();

    ensureEvalShown(resp.payload);
    addFilter({
      id: Date.now().toString(),
      field: EvaluationFiltersDefaultFields.EvalApplied,
      comparator: "=",
      value: resp.payload,
    });

    disclosure.onClose();
  }, [mutation, dataset?.id, disclosure.onClose, name, instructions, ensureEvalShown, addFilter]);

  const numComparisons = useMemo(
    () => ((numDatasetEntries || 0) * includedModelIds.length * (includedModelIds.length - 1)) / 2,
    [numDatasetEntries, includedModelIds],
  );

  return (
    <Modal {...disclosure} size="xl">
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>New Head-to-Head Evaluation</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            <Text>
              Use evaluations to ask specific questions about the outputs of your fine-tuned models.
              GPT-4 will compare each model's output head-to-head and assign scores based on which
              it thinks is better.
            </Text>
            <Text>
              Avoid mentioning model names in the instructions, as GPT-4 will not have access to the
              names of the models it is evaluating.
            </Text>
            {needsMissingOpenaiKey ? (
              <Text>
                To create evaluations, add your OpenAI API key on the{" "}
                <ChakraLink as={Link} href="/project/settings" target="_blank" color="blue.600">
                  <Text as="span">project settings</Text>
                </ChakraLink>{" "}
                page.
              </Text>
            ) : (
              <VStack alignItems="flex-start" w="full" spacing={8}>
                <VStack alignItems="flex-start" w="full">
                  <Text fontWeight="bold">Name</Text>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Evaluation 1"
                    w="full"
                  />
                </VStack>
                <VStack alignItems="flex-start" w="full">
                  <Text fontWeight="bold">Models</Text>
                  <HStack flexWrap="wrap">
                    {modelOptions.map((model) => (
                      <Button
                        key={model.id}
                        variant={includedModelIds.includes(model.id) ? "solid" : "outline"}
                        colorScheme="blue"
                        onClick={() =>
                          setIncludedModelIds((ids) =>
                            ids.includes(model.id)
                              ? ids.filter((id) => id !== model.id)
                              : [...ids, model.id],
                          )
                        }
                      >
                        {model.name}
                      </Button>
                    ))}
                  </HStack>
                </VStack>
                <VStack alignItems="flex-start" w="full">
                  <Text fontWeight="bold">Dataset Entries</Text>
                  <Input
                    value={numDatasetEntries}
                    onChange={(e) => setNumDatasetEntries(Number(e.target.value) || 0)}
                    placeholder="10"
                    w="full"
                  />
                  <Text
                    bgColor="orange.50"
                    borderColor="orange.500"
                    borderRadius={4}
                    borderWidth={1}
                    p={2}
                  >
                    Your eval will run <b>{numComparisons}</b> head-to-head comparisons and cost
                    approximately <b>${(numComparisons * 0.06).toFixed(2)}</b>.
                  </Text>
                </VStack>
                <VStack alignItems="flex-start" w="full">
                  <Text fontWeight="bold">Instructions</Text>
                  <AutoResizeTextArea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Whose output is more friendly?"
                    w="full"
                    minH={32}
                  />
                </VStack>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button colorScheme="gray" onClick={disclosure.onClose} minW={24}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={onCreationConfirm}
              minW={24}
              isLoading={creationInProgress}
              isDisabled={
                !name || !instructions || !numDatasetEntries || includedModelIds.length < 2
              }
            >
              Create
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddEvalModal;
