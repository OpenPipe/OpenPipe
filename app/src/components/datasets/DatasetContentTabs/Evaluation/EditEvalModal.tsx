import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import Link from "next/link";

import { api } from "~/utils/api";
import {
  useDataset,
  useDatasetEval,
  useHandledAsyncCallback,
  useSelectedProject,
} from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { useAppStore } from "~/state/store";
import DeleteEvalDialog from "./DeleteEvalDialog";
import InfoCircle from "~/components/InfoCircle";
import { getOutputTitle } from "./getOutputTitle";

const EditEvalModal = () => {
  const utils = api.useContext();

  const selectedProject = useSelectedProject().data;
  const needsMissingOpenaiKey = !selectedProject?.condensedOpenAIKey;

  const dataset = useDataset().data;
  const datasetEvalIdToEdit = useAppStore((state) => state.evaluationsSlice.datasetEvalIdToEdit);
  const setDatasetEvalIdToEdit = useAppStore(
    (state) => state.evaluationsSlice.setDatasetEvalIdToEdit,
  );
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );
  const resetEvaluationsSlice = useAppStore(
    (state) => state.evaluationsSlice.resetEvaluationsSlice,
  );
  const datasetEval = useDatasetEval(datasetEvalIdToEdit).data;

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
  const [deletionInitiated, setDeletionInitiated] = useState(false);

  const reset = useCallback(() => {
    if (datasetEval) {
      setName(datasetEval.name);
      setInstructions(datasetEval.instructions ?? "");
      setNumDatasetEntries(datasetEval.numDatasetEntries);
      setIncludedModelIds(datasetEval.outputSources.map((source) => source.modelId));
    }
  }, [datasetEval, setName, setInstructions, setNumDatasetEntries, setIncludedModelIds]);

  useEffect(() => reset(), [datasetEval, reset]);

  const saveMutation = api.datasetEvals.update.useMutation();

  const [onSaveConfirm, saveInProgress] = useHandledAsyncCallback(async () => {
    if (
      !dataset?.id ||
      !datasetEvalIdToEdit ||
      !name ||
      !instructions ||
      !numDatasetEntries ||
      includedModelIds.length < 2
    )
      return;
    const resp = await saveMutation.mutateAsync({
      id: datasetEvalIdToEdit,
      updates: {
        name,
        instructions,
        numDatasetEntries,
        modelIds: includedModelIds,
      },
    });
    if (maybeReportError(resp)) return;
    await utils.datasetEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasetEntries.testingStats.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();

    setDatasetEvalIdToEdit(null);
    setComparisonCriteria(null);
  }, [
    saveMutation,
    dataset?.id,
    datasetEvalIdToEdit,
    setDatasetEvalIdToEdit,
    setComparisonCriteria,
    name,
    instructions,
  ]);

  const hasChanged =
    name !== datasetEval?.name ||
    instructions !== datasetEval?.instructions ||
    numDatasetEntries !== datasetEval?.numDatasetEntries ||
    includedModelIds.length !== datasetEval?.outputSources.length;

  const numAddedComparisons = useMemo(() => {
    if (!datasetEval?.outputSources) return 0;

    const numRowFinalComparisons = (includedModelIds.length * (includedModelIds.length - 1)) / 2;

    // If the instructions have changed, we need to re-evaluate all comparisons
    if (instructions !== datasetEval.instructions) {
      return numRowFinalComparisons * numDatasetEntries;
    }

    const numPersistedRows = Math.min(datasetEval.numDatasetEntries, numDatasetEntries || 0);

    const numNewModelIds = includedModelIds.filter(
      (id) => !datasetEval?.outputSources.some((source) => source.modelId === id),
    ).length;
    const numPersistedRowPersistedComparisons =
      ((includedModelIds.length - numNewModelIds) *
        (includedModelIds.length - numNewModelIds - 1)) /
      2;

    const newComparisonsFromAddedModels =
      numPersistedRows * (numRowFinalComparisons - numPersistedRowPersistedComparisons);

    const numNewRows = Math.max(numDatasetEntries - datasetEval.numDatasetEntries, 0);

    const newComparisonsFromAddedRows = numNewRows * numRowFinalComparisons;

    return newComparisonsFromAddedModels + newComparisonsFromAddedRows;
  }, [
    datasetEval?.numDatasetEntries,
    numDatasetEntries,
    datasetEval?.outputSources,
    includedModelIds,
    datasetEval?.instructions,
    instructions,
  ]);

  return (
    <>
      <Modal isOpen={!!datasetEvalIdToEdit} onClose={() => setDatasetEvalIdToEdit(null)} size="xl">
        <ModalOverlay />
        <ModalContent w={1200}>
          <ModalHeader>
            <HStack>
              <Icon as={FaBalanceScale} />
              <Text>Edit Head-to-Head Evaluation</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody maxW="unset">
            <VStack spacing={8}>
              <Text>
                Use evaluations to ask specific questions about the outputs of your fine-tuned
                models. GPT-4 will compare each model's output head-to-head and assign scores based
                on which it thinks is better.
              </Text>
              <Text>
                Avoid mentioning model names in the instructions, as GPT-4 will not have access to
                the names of the models it is evaluating.
              </Text>
              {needsMissingOpenaiKey ? (
                <Text>
                  To edit this evaluation, add your OpenAI API key on the{" "}
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
                    <HStack>
                      <Text fontWeight="bold">Dataset Entries </Text>
                      <InfoCircle tooltipText="The number of randomly selected evaluation dataset entries to apply this eval to." />
                    </HStack>
                    <Input
                      value={numDatasetEntries}
                      type="number"
                      onChange={(e) =>
                        setNumDatasetEntries(parseInt(e.target.value.match(/\d+/g)?.[0] ?? ""))
                      }
                      placeholder="100"
                      w="full"
                    />
                    <Text
                      bgColor="orange.50"
                      borderColor="orange.500"
                      borderRadius={4}
                      borderWidth={1}
                      p={2}
                    >
                      These changes will add <b>{numAddedComparisons}</b> head-to-head comparisons
                      and cost approximately <b>${(numAddedComparisons * 0.06).toFixed(2)}</b>.
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
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => setDeletionInitiated(true)}
                minW={24}
              >
                Delete
              </Button>
              <Button colorScheme="gray" onClick={reset} minW={24}>
                Reset
              </Button>
              <Button
                colorScheme="blue"
                onClick={onSaveConfirm}
                minW={24}
                isLoading={saveInProgress}
                isDisabled={
                  !name ||
                  !instructions ||
                  !numDatasetEntries ||
                  includedModelIds.length < 2 ||
                  !hasChanged
                }
              >
                Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <DeleteEvalDialog
        evalName={datasetEval?.name}
        isOpen={deletionInitiated}
        onCancel={() => setDeletionInitiated(false)}
        onConfirm={() => {
          resetEvaluationsSlice();
          setDeletionInitiated(false);
        }}
      />
    </>
  );
};

export default EditEvalModal;
