import { useEffect, useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";

import { useFineTunes, useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import InputDropdown from "~/components/InputDropdown";
import { useMonitor } from "../../useMonitor";
import { addFilterIds, filtersAreEqual, useFilters } from "~/components/Filters/useFilters";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";

const defaultFilterOptions: FilterOption[] = [
  { type: "text", field: LoggedCallsFiltersDefaultFields.Request, label: "Request" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Response, label: "Response" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.StatusCode, label: "Status Code" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.CompletionId, label: "Completion Id" },
];

const URL_KEY = "pre";

const PrimaryFilters = () => {
  const tagNames = useSelectedProject().data?.tagNames;

  const fineTunes = useFineTunes().data?.fineTunes;

  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.config.initialFilters;
  const savedSampleRate = useMonitor().data?.config.sampleRate;
  const savedMaxOutputSize = useMonitor().data?.config.maxOutputSize;

  console.log({ monitor });

  const { filters, setFilters } = useFilters({ urlKey: URL_KEY });
  const [modelFilter, ...otherFilters] = filters;

  const [sampleRate, setSampleRate] = useState(0);

  const [maxOutputSize, setMaxOutputSize] = useState(0);

  useEffect(() => {
    if (!filters.length && savedFilters && fineTunes?.[0]) {
      if (savedFilters.length) {
        setFilters(addFilterIds(savedFilters));
      } else {
        setFilters([
          {
            id: uuidv4(),
            field: LoggedCallsFiltersDefaultFields.Model,
            comparator: "=",
            value: "",
          },
        ]);
      }
    }
  }, [fineTunes, savedFilters, filters, setFilters]);

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

  const saveDisabled =
    !monitor ||
    !sampleRate ||
    !maxOutputSize ||
    !filters.length ||
    !modelFilter?.value ||
    noChanges;

  const projectUpdateMutation = api.monitors.update.useMutation();

  const utils = api.useUtils();

  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await projectUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        initialFilters: filters,
        sampleRate,
        maxOutputSize,
      },
    });

    toast({
      description: "Primary filters updated",
      status: "success",
    });

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [projectUpdateMutation, utils, saveDisabled, monitor?.id, filters, sampleRate, maxOutputSize]);

  const filterOptions = useMemo(() => {
    const tagFilters: FilterOption[] = (tagNames || []).map((tag) => ({
      type: "text",
      field: `tags.${tag}`,
      label: tag,
    }));
    return [...defaultFilterOptions, ...tagFilters];
  }, [tagNames]);

  if (!modelFilter || !fineTunes) {
    return null;
  }

  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Model
        </Text>
        <InputDropdown
          options={fineTunes.map((fineTune) => `openpipe:${fineTune.slug}`)}
          selectedOption={modelFilter.value}
          onSelect={(value) => {
            setFilters([{ ...modelFilter, value }, ...otherFilters]);
          }}
          maxPopoverContentHeight={400}
          minItemHeight={10}
          placeholder="Select model"
          inputGroupProps={{ minW: 300 }}
        />
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
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        <FilterContents filters={otherFilters} filterOptions={filterOptions} urlKey={URL_KEY} />
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
    </Card>
  );
};

export default PrimaryFilters;
