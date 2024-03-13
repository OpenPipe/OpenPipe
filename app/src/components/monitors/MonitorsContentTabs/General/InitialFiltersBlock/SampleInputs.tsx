import { useEffect, useState } from "react";
import {
  VStack,
  HStack,
  Skeleton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";

import { useLoggedCallsCount } from "~/utils/hooks";

import { LabelText, CaptionText } from "../styledText";
import { useFilters } from "~/components/Filters/useFilters";
import { INITIAL_FILTERS_URL_KEY } from "../constants";

const SampleInputs = ({
  sampleRate,
  maxOutputSize,
  setSampleRate,
  setMaxOutputSize,
}: {
  sampleRate: number;
  maxOutputSize: number;
  setSampleRate: (sampleRate: number) => void;
  setMaxOutputSize: (maxOutputSize: number) => void;
}) => {
  const filters = useFilters({ urlKey: INITIAL_FILTERS_URL_KEY }).filters;
  const initialCount = useLoggedCallsCount({ filters, disabled: !filters.length }).data?.count;

  // Store as string to allow for temporarily invalid values
  const [sampleRateStr, setSampleRateStr] = useState("0");

  useEffect(() => {
    setSampleRateStr(sampleRate.toString());
    setMaxOutputSize(maxOutputSize);
  }, [sampleRate, maxOutputSize]);

  return (
    <VStack alignItems="flex-start" pt={8}>
      <HStack alignItems="flex-start">
        <VStack alignItems="flex-start">
          <LabelText>Sample Rate (%)</LabelText>
          <NumberInput
            value={sampleRateStr}
            inputMode="decimal"
            onChange={(value) => setSampleRateStr(value)}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);

              if (value > 100) {
                setSampleRate(100);
              } else if (value >= 0 && value <= 100) {
                setSampleRate(value);
              } else {
                setSampleRate(0);
              }
            }}
            max={100}
            min={0}
            precision={3}
            step={0.001}
            w={300}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </VStack>
        <VStack alignItems="flex-start">
          <LabelText>Max Sample Size</LabelText>
          <NumberInput
            value={maxOutputSize}
            inputMode="numeric"
            onChange={(value) => setMaxOutputSize(parseInt(value))}
            max={20000}
            min={1}
            step={1}
            w={300}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </VStack>
      </HStack>
      <HStack spacing={1}>
        <Skeleton isLoaded={initialCount !== undefined}>
          <CaptionText>{initialCount?.toLocaleString() ?? 10}</CaptionText>
        </Skeleton>
        <CaptionText> rows will immediately be checked</CaptionText>
      </HStack>
    </VStack>
  );
};

export default SampleInputs;
