import { Input, VStack, Text, Checkbox, HStack } from "@chakra-ui/react";
import { useMemo } from "react";
import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import InfoCircle from "~/components/InfoCircle";
import InputDropdown from "~/components/InputDropdown";
import frontendModelProvider from "~/modelProviders/openai-ChatCompletion/frontend";
import { getOutputTitle } from "~/server/utils/getOutputTitle";
import { ORIGINAL_MODEL_ID } from "~/types/dbColumns.types";
import { externalModel } from "~/utils/externalModels/allModels";
import { predefinedEvaluationModels } from "~/utils/externalModels/evaluationModels";
import { useDataset, useNodeEntries } from "~/utils/hooks";

interface EvalNameProps {
  datasetId: string;
  nameState: {
    name: string;
    setName: React.Dispatch<React.SetStateAction<string>>;
  };
  modelState: {
    includedModelIds: string[];
    setIncludedModelIds: React.Dispatch<React.SetStateAction<string[]>>;
  };
  rowsState: {
    numRows: number;
    setNumRows: React.Dispatch<React.SetStateAction<number>>;
    numAddedComparisons?: number;
  };
  evaluationModelState: {
    selectedEvaluationModel: externalModel;
    setSelectedEvaluationModel: React.Dispatch<React.SetStateAction<externalModel>>;
  };
  instructionsState: {
    instructions: string;
    setInstructions: React.Dispatch<React.SetStateAction<string>>;
  };
}

const EvalForm: React.FC<EvalNameProps> = ({
  datasetId,
  nameState,
  modelState,
  rowsState,
  evaluationModelState,
  instructionsState,
}) => {
  const { name, setName } = nameState;
  const { includedModelIds, setIncludedModelIds } = modelState;
  const { numRows, setNumRows, numAddedComparisons } = rowsState;
  const { selectedEvaluationModel, setSelectedEvaluationModel } = evaluationModelState;
  const { instructions, setInstructions } = instructionsState;

  const additionalInputPayloadTokens = 40;
  const outputTokensPerComparison = 60;

  const dataset = useDataset({ datasetId }).data;
  const datasetEntries = useNodeEntries({ nodeId: dataset?.nodeId }).data;
  const evaluationModels = predefinedEvaluationModels;

  const modelPrice = useMemo(() => {
    const model =
      frontendModelProvider.models[
        selectedEvaluationModel.name as keyof typeof frontendModelProvider.models
      ];
    return {
      inputTokenPrice: model?.promptTokenPrice ?? 0,
      outputTokenPrice: model?.completionTokenPrice ?? 0,
    };
  }, [selectedEvaluationModel]);

  const inputTokensPerComparison = useMemo(() => {
    if (!datasetEntries?.entries.length) return 0;

    const totalTokensPerEntry = datasetEntries.entries.reduce(
      (acc, entry) => acc + (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0),
      0,
    );
    const averageTokensPerEntry = totalTokensPerEntry / datasetEntries.entries.length;

    return averageTokensPerEntry * 2 + additionalInputPayloadTokens;
  }, [datasetEntries]);

  const totalCost = useMemo(() => {
    const { inputTokenPrice, outputTokenPrice } = modelPrice;

    const costPerComparison =
      inputTokensPerComparison * inputTokenPrice + outputTokensPerComparison * outputTokenPrice;

    return (costPerComparison * numAddedComparisons).toFixed(2);
  }, [inputTokensPerComparison, modelPrice, numAddedComparisons]);

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

  return (
    <>
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
                  ids.includes(model.id) ? ids.filter((id) => id !== model.id) : [...ids, model.id],
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
        <Text bgColor="orange.50" borderColor="orange.500" borderRadius={4} borderWidth={1} p={2}>
          These changes will add <b>{numAddedComparisons}</b> head-to-head comparisons
          {modelPrice.inputTokenPrice > 0 && (
            <>
              {" "}
              and cost approximately <b>${totalCost}</b>
            </>
          )}
          .
        </Text>
      </VStack>
      <VStack alignItems="flex-start" w="full">
        <HStack>
          <Text fontWeight="bold">Judge model:</Text>
          <InfoCircle tooltipText="The model to use to judge between two outputs and determine which is better" />
        </HStack>
        <InputDropdown
          options={evaluationModels}
          getDisplayLabel={(option) => option.slug}
          selectedOption={selectedEvaluationModel}
          onSelect={(option) => setSelectedEvaluationModel(option)}
          inputGroupProps={{ w: "100%" }}
        />
        <Text fontWeight="bold">Instructions</Text>
        <AutoResizeTextArea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Which model's output better matches the prompt?"
          w="full"
          minH={32}
        />
      </VStack>
    </>
  );
};

export default EvalForm;
