import React from "react";
import chroma from "chroma-js";

import { VStack, HStack, Text, Box, type StackProps, Spinner } from "@chakra-ui/react";
import { useDataset, useDatasetEntries } from "~/utils/hooks";
import { useFilters } from "~/components/Filters/useFilters";
import { ProviderWithModel } from "~/server/fineTuningProviders/types";
import { splitProvider } from "~/server/fineTuningProviders/supportedModels";
import { api } from "~/utils/api";

interface Props extends StackProps {
  selectedBaseModel: ProviderWithModel;
  appliedPruningRuleIds: string[];
}

const TrainingEntryMeter = (props: Props) => {
  const datasetEntries = useDatasetEntries().data;

  const dataset = useDataset().data;
  const filters = useFilters().filters;

  if (!dataset) return null;

  const stats = api.datasets.getTrainingCosts.useQuery(
    {
      datasetId: dataset?.id,
      baseModel: splitProvider(props.selectedBaseModel),
      filters,
      pruningRuleIds: props.appliedPruningRuleIds,
    },
    { enabled: !!dataset },
  );

  console.log(stats.data);

  const { cost, costWithoutPruning } = stats.data ?? {};

  // Get the number of training entries
  const numTrainingEntries = datasetEntries?.matchingTrainingCount || 0;

  // Calculate the position for the gradient stop
  const position = calculateLogPosition(numTrainingEntries, 10, 100000);

  let helperText;

  if (numTrainingEntries < 10) {
    helperText = `You need at least 10 training entries to train a model. We recommend at least 100 training entries for even simple tasks. For more complex tasks 2K+ entries are a good minimum. You can expect performance to continue improving into the 10K+ range, and even into the 50K+ range if there are difficult edge cases your model needs to learn.`;
  } else if (numTrainingEntries < 100) {
    helperText = `We recommend at least 100 training entries for even simple tasks. For more complex tasks 2K+ entries are a good minimum. You can expect performance to continue improving into the 10K+ range, and even into the 50K+ range if there are difficult edge cases your model needs to learn.`;
  } else if (numTrainingEntries < 2000) {
    helperText = `You may have enough training data for simple tasks, but for more complex tasks 2K+ entries are a good minimum. You can expect performance to continue improving into the 10K+ range, and even into the 50K+ range if there are difficult edge cases your model needs to learn.`;
  } else if (numTrainingEntries < 10000) {
    helperText = `This dataset is a good start. You can expect performance to continue improving into the 10K+ range, and even into the 50K+ range if there are difficult edge cases your model needs to learn.`;
  } else {
    helperText = `You have a large amount of training data. To continue improving model performance, you can continue adding more data. You should also ensure that your dataset is representative of the data you expect to see in production and that the outputs are high quality.`;
  }

  return (
    <VStack
      alignItems="flex-start"
      w="full"
      spacing={6}
      bgColor="gray.50"
      p={4}
      borderColor="gray.300"
      borderWidth={1}
      borderRadius={4}
      {...props}
    >
      <HStack justifyContent="space-between" w="100%">
        <HStack fontSize="sm" spacing={1}>
          <Text fontWeight="bold">Training Size:</Text>
          <TrainingSizeScore numTrainingEntries={numTrainingEntries} />
        </HStack>
        <VStack fontSize="sm" spacing={1} alignItems="end">
          <Text fontWeight="bold">
            Estimated training price:{" "}
            {stats.isLoading ? <Spinner /> : "$" + Number(cost ?? 0).toFixed(2)}
          </Text>
          {!stats.isLoading && Number(costWithoutPruning ?? 0) > Number(cost ?? 0) && (
            <Text>
              Saved with pruning: -$
              {(Number(costWithoutPruning ?? 0) - Number(cost ?? 0)).toFixed(2)}
            </Text>
          )}
        </VStack>
      </HStack>

      <Text fontSize="sm">{helperText}</Text>
      <VStack w="full">
        <HStack w="full" justifyContent="space-between">
          {[10, 100, 1000, 10000, 100000].map((num, i) => (
            <Text
              key={num}
              fontSize="2xs"
              fontWeight="bold"
              w={12}
              textAlign={i > 2 ? "end" : undefined}
            >
              {num.toLocaleString()}
            </Text>
          ))}
        </HStack>
        <VStack w="full" spacing={0}>
          <HStack w="full" justifyContent="space-between" px="1px">
            {Array.from(Array(40)).map((_, i) => (
              <Box key={i} h={2} w="1px" bgColor="gray.300" />
            ))}
          </HStack>
          <Box
            borderRadius={4}
            borderWidth={1}
            position="relative"
            w="full"
            h="20px"
            bgColor="orange.500"
          >
            <Box
              position="absolute"
              right={0}
              bottom={0}
              h="full"
              w={`${100 - position}%`}
              bgColor="white"
            />
          </Box>
        </VStack>
        <HStack w="full" justifyContent="space-between" fontWeight="bold" fontSize="xs">
          <Text>Minimal</Text>
          <Text>Moderate</Text>
          <Text>Extensive</Text>
        </HStack>
      </VStack>
    </VStack>
  );
};

export default TrainingEntryMeter;

// Function to calculate the logarithmic position
const calculateLogPosition = (value: number, min: number, max: number) => {
  // Avoid negative or zero values
  const safeValue = Math.max(value, 1);
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const scale = (Math.log(safeValue) - logMin) / (logMax - logMin);

  return Math.min(Math.max(scale, 0), 1) * 100;
};

const TrainingSizeScore = ({ numTrainingEntries }: { numTrainingEntries: number }) => {
  let text;

  if (numTrainingEntries < 10) {
    text = "Insufficient";
  } else if (numTrainingEntries < 100) {
    text = "Minimal";
  } else if (numTrainingEntries < 500) {
    text = "Low";
  } else if (numTrainingEntries < 2000) {
    text = "Moderate";
  } else if (numTrainingEntries < 5000) {
    text = "Considerable";
  } else if (numTrainingEntries < 20000) {
    text = "Substantial";
  } else {
    text = "Extensive";
  }

  const position = calculateLogPosition(numTrainingEntries, 10, 10000);
  const scale = position / 100;
  const color = chroma.scale(["red", "green"]).mode("lrgb")(scale).hex();

  return (
    <Text color={color} fontWeight="bold">
      {text}
    </Text>
  );
};
