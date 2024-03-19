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

  const [sampleRate, setSampleRate] = useState(0);

  const [maxOutputSize, setMaxOutputSize] = useState(0);

  useEffect(() => {
    if (savedFilters) setFilters(addFilterIds(savedFilters));
  }, [savedFilters]);

  useEffect(() => {
    if (savedSampleRate !== undefined && savedMaxOutputSize !== undefined) {
      setSampleRate(savedSampleRate);
      setMaxOutputSize(savedMaxOutputSize);
    }
  }, [savedSampleRate, savedMaxOutputSize]);

  const noChanges =
    !savedFilters ||
    (filtersAreEqual(filters, savedFilters) &&
      savedSampleRate === sampleRate &&
      savedMaxOutputSize === maxOutputSize);

  const saveDisabled = !monitor || !sampleRate || !maxOutputSize || !filters.length || noChanges;

  const projectUpdateMutation = api.monitors.update.useMutation();

  const utils = api.useUtils();

  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await projectUpdateMutation.mutateAsync({
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
  }, [projectUpdateMutation, utils, saveDisabled, monitor?.id, filters, sampleRate, maxOutputSize]);

  const isLoaded = savedSampleRate !== undefined && !!savedFilters;

  const estimatedMatches = Math.round((initialCount ?? 0) * (sampleRate / 100));

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <VStack alignItems="flex-start">
            <Text fontWeight="bold" color="gray.500">
              Sample Rate (%)
            </Text>
            <NumberInput
              value={sampleRate}
              onChange={(value) => setSampleRate(parseFloat(value))}
              max={100}
              min={0}
              precision={2}
              step={0.2}
              w={300}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="xs" color="gray.500" fontWeight="500">
              <HStack spacing={1}>
                <Text>Secondary filters will process an estimated</Text>
                <Skeleton isLoaded={initialCount !== undefined}>
                  {estimatedMatches.toLocaleString()}
                </Skeleton>
                <Text> matches</Text>
              </HStack>
            </Text>
          </VStack>
          <HStack spacing={4}>
            <Text fontWeight="bold" color="gray.500">
              Filters
            </Text>
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
                if (savedSampleRate) setSampleRate(savedSampleRate);
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
