import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, HStack, VStack, Text, useDisclosure } from "@chakra-ui/react";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import { useDataset, useDatasetEval, useHandledAsyncCallback } from "~/utils/hooks";
import DeleteEvalDialog from "./DeleteEvalDialog";
import { useAppStore } from "~/state/store";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import ContentCard from "~/components/ContentCard";
import ViewDatasetButton from "~/components/datasets/ViewDatasetButton";
import { DATASET_EVALUATION_TAB_KEY } from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import ConditionallyEnable from "~/components/ConditionallyEnable";
import { defaultEvaluationModel } from "~/utils/externalModels/evaluationModels";
import EvalForm from "../../EvalForm/EvalForm";
import { type ExternalModel } from "@prisma/client";

const Settings = () => {
  const utils = api.useContext();

  const saveMutation = api.datasetEvals.update.useMutation();

  const deleteEvalDialog = useDisclosure();
  const datasetEval = useDatasetEval().data;
  const dataset = useDataset({ datasetId: datasetEval?.datasetId }).data;

  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );

  const usedEvaluationModel = api.externalModels.get.useQuery(
    { id: datasetEval?.evaluationModelId },
    { enabled: !!datasetEval },
  ).data;

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [numRows, setNumRows] = useState(0);
  const [includedModelIds, setIncludedModelIds] = useState<string[]>([]);
  const [selectedEvaluationModel, setSelectedEvaluationModel] =
    useState<ExternalModel>(defaultEvaluationModel);

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
        evaluationModelId: selectedEvaluationModel.id,
      },
    });
    if (maybeReportError(resp)) return;

    await utils.nodeEntries.listTestingEntries.invalidate({ datasetId: dataset.id });
    await utils.datasetEvals.testingStats.invalidate({ datasetId: dataset.id });
    await utils.datasets.get.invalidate();
    await utils.datasetEvals.get.invalidate({ id: datasetEval.id });

    setComparisonCriteria(null);
  }, [saveMutation, dataset?.id, datasetEval?.id, setComparisonCriteria, name, instructions]);

  const hasChanged =
    name !== datasetEval?.name ||
    instructions !== datasetEval?.instructions ||
    numRows !== datasetEval?.numRows ||
    selectedEvaluationModel.id !== datasetEval?.evaluationModelId ||
    !isEqual(
      includedModelIds.sort(),
      datasetEval?.outputSources.map((source) => source.modelId).sort(),
    );

  const numComparisons = useMemo(() => {
    if (!datasetEval?.outputSources) return 0;

    const numRowFinalComparisons = (includedModelIds.length * (includedModelIds.length - 1)) / 2;

    // If the instructions or model have changed, we need to re-evaluate all comparisons
    if (
      selectedEvaluationModel.id !== datasetEval?.evaluationModelId ||
      instructions !== datasetEval.instructions
    ) {
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
    datasetEval?.evaluationModelId,
    selectedEvaluationModel.id,
  ]);

  const reset = useCallback(() => {
    if (datasetEval) {
      setName(datasetEval.name);
      setInstructions(datasetEval.instructions ?? "");
      setNumRows(datasetEval.numRows);
      setIncludedModelIds(datasetEval.outputSources.map((source) => source.modelId));

      usedEvaluationModel && setSelectedEvaluationModel(usedEvaluationModel);
    }
  }, [datasetEval, setName, setInstructions, setNumRows, setIncludedModelIds]);

  useEffect(() => {
    usedEvaluationModel && setSelectedEvaluationModel(usedEvaluationModel);
  }, [usedEvaluationModel]);

  useEffect(() => void reset(), [datasetEval, reset]);

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
            <EvalForm
              datasetId={datasetEval.datasetId}
              nameState={{ name, setName }}
              modelState={{ includedModelIds, setIncludedModelIds }}
              rowsState={{ numRows, setNumRows, numComparisons }}
              evaluationModelState={{ selectedEvaluationModel, setSelectedEvaluationModel }}
              instructionsState={{ instructions, setInstructions }}
            />
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
