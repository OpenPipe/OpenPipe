import React from "react";
import chroma from "chroma-js";

import { VStack, HStack, Text, Box, type StackProps } from "@chakra-ui/react";
import { useDatasetEntries } from "~/utils/hooks";

const TrainingEntryMeter = (props: StackProps) => {
  const datasetEntries = useDatasetEntries().data;

  // Get the number of training entries
  const numTrainingEntries = datasetEntries?.matchingTrainingCount || 0;

  // Calculate the position for the gradient stop
  const position = calculateLogPosition(numTrainingEntries, 10, 100000);

  let helperText;

  if (numTrainingEntries < 10) {
    helperText = "You need at least 10 training entries to train a model.";
  } else if (numTrainingEntries < 100) {
    helperText = "You have a minimal amount of training data. This may be enough for simple tasks.";
  } else if (numTrainingEntries < 500) {
    helperText = "You have a low amount of training data. Complex tasks may require more.";
  } else if (numTrainingEntries < 2000) {
    helperText = "You have a moderate amount of training data. Add more to increase performance.";
  } else if (numTrainingEntries < 5000) {
    helperText = "You have a considerable amount of training data. Ensure it is high quality.";
  } else if (numTrainingEntries < 20000) {
    helperText = "You have a substantial amount of training data. Ensure it is high quality.";
  } else {
    helperText = "You have an extensive amount of training data. Ensure it is high quality.";
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
      <HStack fontSize="sm" spacing={1}>
        <Text fontWeight="bold">Training Size:</Text>
        <TrainingSizeScore numTrainingEntries={numTrainingEntries} />
      </HStack>
      <Text fontSize="sm">{helperText}</Text>
      <VStack w="full">
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
