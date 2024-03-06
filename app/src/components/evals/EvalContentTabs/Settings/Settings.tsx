import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Checkbox, HStack, Input, VStack, Text, useDisclosure } from "@chakra-ui/react";
import { isEqual } from "lodash-es";

import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import InfoCircle from "~/components/InfoCircle";
import { api } from "~/utils/api";
import { useDataset, useDatasetEval, useHandledAsyncCallback } from "~/utils/hooks";
import DeleteEvalDialog from "./DeleteEvalDialog";
import { useFilters } from "~/components/Filters/useFilters";
import { useAppStore } from "~/state/store";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import ContentCard from "~/components/ContentCard";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import ConditionallyEnable from "~/components/ConditionallyEnable";

const Settings = () => {
  const utils = api.useContext();

  const saveMutation = api.datasetEvals.update.useMutation();

  const datasetEval = useDatasetEval().data;
  const dataset = useDataset({ datasetId: datasetEval?.datasetId }).data;
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [numRows, setNumRows] = useState(0);
  const [includedModelIds, setIncludedModelIds] = useState<string[]>([]);

  const addFilter = useFilters().addFilter;

  const deleteEvalDialog = useDisclosure();

  const [onSaveConfirm, saveInProgress] = useHandledAsyncCallback(async () => {
    if (
      !dataset?.id ||
      !datasetEval?.id ||
      !name ||
      !instructions ||
      !numRows ||
      includedModelIds.length < 2
    )
      return;
    const resp = await saveMutation.mutateAsync({
      id: datasetEval.id,
      updates: {
        name,
        instructions,
        numRows,
        modelIds: includedModelIds,
      },
    });
    if (maybeReportError(resp)) return;
    await utils.nodeEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasetEvals.testingStats.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();
    await utils.datasetEvals.get.invalidate({ id: datasetEval.id });

    setComparisonCriteria(null);
  }, [
    saveMutation,
    addFilter,
    dataset?.id,
    datasetEval?.id,
    setComparisonCriteria,
    name,
    instructions,
  ]);

  const hasChanged =
    name !== datasetEval?.name ||
    instructions !== datasetEval?.instructions ||
    numRows !== datasetEval?.numRows ||
    !isEqual(
      includedModelIds.sort(),
      datasetEval?.outputSources.map((source) => source.modelId).sort(),
    );

  const numAddedComparisons = useMemo(() => {
    if (!datasetEval?.outputSources) return 0;

    const numRowFinalComparisons = (includedModelIds.length * (includedModelIds.length - 1)) / 2;

    // If the instructions have changed, we need to re-evaluate all comparisons
    if (instructions !== datasetEval.instructions) {
      return numRowFinalComparisons * numRows;
    }

    const numPersistedRows = Math.min(datasetEval.numRows, numRows || 0);

    const numNewModelIds = includedModelIds.filter(
      (id) => !datasetEval?.outputSources.some((source) => source.modelId === id),
    ).length;
    const numPersistedRowPersistedComparisons =
      ((includedModelIds.length - numNewModelIds) *
        (includedModelIds.length - numNewModelIds - 1)) /
      2;

    const newComparisonsFromAddedModels =
      numPersistedRows * (numRowFinalComparisons - numPersistedRowPersistedComparisons);

    const numNewRows = Math.max(numRows - datasetEval.numRows, 0);

    const newComparisonsFromAddedRows = numNewRows * numRowFinalComparisons;

    return newComparisonsFromAddedModels + newComparisonsFromAddedRows;
  }, [
    datasetEval?.numRows,
    numRows,
    datasetEval?.outputSources,
    includedModelIds,
    datasetEval?.instructions,
    instructions,
  ]);

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

  const reset = useCallback(() => {
    if (datasetEval) {
      setName(datasetEval.name);
      setInstructions(datasetEval.instructions ?? "");
      setNumRows(datasetEval.numRows);
      setIncludedModelIds(datasetEval.outputSources.map((source) => source.modelId));
    }
  }, [datasetEval, setName, setInstructions, setNumRows, setIncludedModelIds]);

  useEffect(() => reset(), [datasetEval, reset]);

  if (!datasetEval?.datasetName) return null;

  return (
    <>
      <VStack alignItems="flex-start" w="full" pb={16}>
        <Text fontSize="2xl" fontWeight="bold">
          Eval Settings
        </Text>
        <Text fontSize="sm">
          Configure your eval settings. These settings only apply to <b>{datasetEval.name}</b>.
        </Text>
        <ContentCard>
          <VStack alignItems="flex-start" w="full" spacing={8}>
            <VStack alignItems="flex-start">
              <Text fontWeight="bold">Dataset</Text>
              <ViewDatasetButton
                buttonText={datasetEval.datasetName}
                datasetId={datasetEval.datasetId}
                tabKey={DATASET_EVALUATION_TAB_KEY}
                fontWeight="500"
              />
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <Text fontWeight="bold">Name</Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Eval1"
                w="full"
              />
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <Text fontWeight="bold" pb={2}>
                Included Models
              </Text>
              <VStack alignItems="flex-start">
                {modelOptions.map((model) => (
                  <Checkbox
                    key={model.id}
                    isChecked={includedModelIds.includes(model.id)}
                    colorScheme="blue"
                    onChange={() =>
                      setIncludedModelIds((ids) =>
                        ids.includes(model.id)
                          ? ids.filter((id) => id !== model.id)
                          : [...ids, model.id],
                      )
                    }
                  >
                    <Text>{model.name}</Text>
                  </Checkbox>
                ))}
              </VStack>
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <HStack>
                <Text fontWeight="bold">Dataset Entries</Text>
                <InfoCircle tooltipText="The number of randomly selected dataset entries to apply this eval to." />
              </HStack>
              <Input
                value={numRows}
                type="number"
                onChange={(e) => setNumRows(parseInt(e.target.value.match(/\d+/g)?.[0] ?? ""))}
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
                These changes will add <b>{numAddedComparisons}</b> head-to-head comparisons and
                cost approximately <b>${(numAddedComparisons * 0.06).toFixed(2)}</b>.
              </Text>
            </VStack>
            <VStack alignItems="flex-start" w="full">
              <Text fontWeight="bold">Instructions</Text>
              <AutoResizeTextArea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Which model's output better matches the prompt?"
                w="full"
                minH={32}
              />
            </VStack>
            <HStack alignSelf="flex-end">
              <ConditionallyEnable accessRequired="requireCanModifyProject">
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={deleteEvalDialog.onOpen}
                  minW={24}
                >
                  Delete
                </Button>
              </ConditionallyEnable>
              <Button colorScheme="gray" onClick={reset} minW={24}>
                Reset
              </Button>
              <ConditionallyEnable
                accessRequired="requireCanModifyProject"
                checks={[
                  [!!name, "Eval name is required"],
                  [!!instructions, "Instructions are required"],
                  [!!numRows, "Include one or more dataset entries"],
                  [includedModelIds.length >= 2, "At least two models must be included"],
                  [hasChanged, ""],
                ]}
              >
                <Button
                  colorScheme="blue"
                  onClick={onSaveConfirm}
                  minW={24}
                  isLoading={saveInProgress}
                >
                  Save
                </Button>
              </ConditionallyEnable>
            </HStack>
          </VStack>
        </ContentCard>
      </VStack>
      <DeleteEvalDialog disclosure={deleteEvalDialog} />
    </>
  );
};

export default Settings;
