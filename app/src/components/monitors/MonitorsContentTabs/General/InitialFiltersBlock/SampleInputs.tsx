import { useEffect, useState } from "react";
import {
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";

import { LabelText } from "../styledText";
import InfoCircle from "~/components/InfoCircle";
import { useMonitorFilters } from "../useMonitorFilters";

const SampleInputs = () => {
  const { sampleRate, maxOutputSize, setSamplingCriteria } = useMonitorFilters();

  // Store as string to allow for temporarily invalid values
  const [tempSampleRateStr, setTempSampleRateStr] = useState("0");
  const [tempMaxOutputSize, setTempMaxOutputSize] = useState(maxOutputSize);

  useEffect(() => {
    setTempSampleRateStr(sampleRate.toString());
    setTempMaxOutputSize(maxOutputSize);
  }, [sampleRate, maxOutputSize]);

  return (
    <VStack alignItems="flex-start" pt={8}>
      <HStack alignItems="flex-start">
        <VStack alignItems="flex-start">
          <LabelText>Sample Rate (%)</LabelText>
          <NumberInput
            value={tempSampleRateStr}
            inputMode="decimal"
            onChange={(value) => setTempSampleRateStr(value)}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);

              if (value > 100) {
                setSamplingCriteria({ sampleRate: 100, maxOutputSize });
              } else if (value >= 0 && value <= 100) {
                setSamplingCriteria({ sampleRate: value, maxOutputSize });
              } else {
                setSamplingCriteria({ sampleRate: 0, maxOutputSize });
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
          <HStack>
            <LabelText>Max Rows to Check</LabelText>
            <InfoCircle
              tooltipText={`The monitor will stop processing new rows after ${maxOutputSize.toLocaleString()} have been checked.`}
            />
          </HStack>
          <NumberInput
            value={tempMaxOutputSize}
            inputMode="numeric"
            onChange={(value) => setTempMaxOutputSize(parseInt(value))}
            onBlur={(e) => {
              const value = parseInt(e.target.value);

              if (value > 20000) {
                setSamplingCriteria({ sampleRate, maxOutputSize: 20000 });
              } else if (value >= 1 && value <= 20000) {
                setSamplingCriteria({ sampleRate, maxOutputSize: value });
              } else {
                setSamplingCriteria({ sampleRate, maxOutputSize: 1 });
              }
            }}
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
    </VStack>
  );
};

export default SampleInputs;
