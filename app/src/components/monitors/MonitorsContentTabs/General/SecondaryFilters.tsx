import { useEffect, useState } from "react";
import {
  Card,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  Button,
  Skeleton,
} from "@chakra-ui/react";

import { useHandledAsyncCallback, useLoggedCallsCount } from "~/utils/hooks";
import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import { useMonitor } from "../../useMonitor";
import { addFilterIds, filtersAreEqual, useFilters } from "~/components/Filters/useFilters";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";
import { INITIAL_FILTERS_URL_KEY } from "./InitialFilters";
import TextSwitch from "./TextSwitch";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { LabelText, CaptionText } from "./styledText";

export const SECONDARY_FILTERS_URL_KEY = "secondary";

const secondaryFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input, label: "Request" },
  { type: "text", field: GeneralFiltersDefaultFields.Output, label: "Response" },
];

const SecondaryFilters = () => {
  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.filter.config.filters;
  const savedSampleRate = useMonitor().data?.config.sampleRate;
  const savedMaxOutputSize = useMonitor().data?.config.maxOutputSize;

  const { filters: initialFilters } = useFilters({ urlKey: INITIAL_FILTERS_URL_KEY });
  const { filters, setFilters } = useFilters({ urlKey: SECONDARY_FILTERS_URL_KEY });

  const initialCount = useLoggedCallsCount({ filters: initialFilters }).data?.count;

  // Store as string to allow for temporarily invalid values
  const [sampleRateStr, setSampleRateStr] = useState("0");
  const sampleRate = parseFloat(sampleRateStr);
  const [maxOutputSize, setMaxOutputSize] = useState(0);

  useEffect(() => {
    if (savedFilters) setFilters(addFilterIds(savedFilters));
  }, [savedFilters]);

  useEffect(() => {
    if (savedSampleRate !== undefined && savedMaxOutputSize !== undefined) {
      setSampleRateStr(savedSampleRate.toString());
      setMaxOutputSize(savedMaxOutputSize);
    }
  }, [savedSampleRate, savedMaxOutputSize]);

  const noChanges =
    !savedFilters ||
    (filtersAreEqual(filters, savedFilters) &&
      savedSampleRate === sampleRate &&
      savedMaxOutputSize === maxOutputSize);

  const saveDisabled = !monitor || !sampleRate || !maxOutputSize || noChanges;

  const utils = api.useUtils();

  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await monitorUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        checkFilters: filters,
        sampleRate,
        maxOutputSize,
      },
    });

    toast({
      description: "Secondary filters updated",
      status: "success",
    });

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [monitorUpdateMutation, utils, saveDisabled, monitor?.id, filters, sampleRate, maxOutputSize]);

  const isLoaded = savedSampleRate !== undefined && !!savedFilters;

  const estimatedMatches = Math.min(
    maxOutputSize,
    Math.round((initialCount ?? 0) * (sampleRate / 100)),
  );

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
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
            <CaptionText>
              <HStack spacing={1}>
                <Text>Filters will process at most</Text>
                <Skeleton isLoaded={maxOutputSize !== undefined}>
                  {maxOutputSize.toLocaleString()}
                </Skeleton>
                <Text> matches</Text>
              </HStack>
            </CaptionText>
          </VStack>
          <VStack alignItems="flex-start">
            <LabelText>Sample Rate (%)</LabelText>
            <NumberInput
              value={sampleRateStr}
              inputMode="decimal"
              onChange={(value) => setSampleRateStr(value)}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);

                console.log(value);

                if (value > 100) {
                  setSampleRateStr("100");
                } else if (value >= 0 && value <= 100) {
                  setSampleRateStr(e.target.value);
                } else {
                  setSampleRateStr("0");
                }
              }}
              max={100}
              min={0}
              precision={3}
              step={0.01}
              w={300}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <CaptionText>
              <HStack spacing={1}>
                <Text>Filters will immediately process an estimated</Text>
                <Skeleton isLoaded={initialCount !== undefined}>
                  {estimatedMatches.toLocaleString()}
                </Skeleton>
                <Text> matches</Text>
              </HStack>
            </CaptionText>
          </VStack>

          <HStack spacing={4}>
            <LabelText>Filters</LabelText>
            <TextSwitch
              options={[
                { value: "SQL" },
                { value: "LLM", selectedBgColor: "blue.500", alternateTextColor: "white" },
              ]}
            />
          </HStack>
          <FilterContents
            filters={filters}
            filterOptions={secondaryFilterOptions}
            urlKey={SECONDARY_FILTERS_URL_KEY}
          />
          <HStack w="full" justifyContent="flex-end">
            <Button
              onClick={() => {
                if (savedSampleRate) setSampleRateStr(savedSampleRate.toString());
                if (savedMaxOutputSize) setMaxOutputSize(savedMaxOutputSize);
                if (savedFilters) setFilters(addFilterIds(savedFilters));
              }}
              isDisabled={noChanges || updatingMonitor}
            >
              Reset
            </Button>
            <Button
              colorScheme="blue"
              isDisabled={saveDisabled || updatingMonitor}
              onClick={updateMonitor}
            >
              Save
            </Button>
          </HStack>
        </VStack>
      </Skeleton>
    </Card>
  );
};

export default SecondaryFilters;
