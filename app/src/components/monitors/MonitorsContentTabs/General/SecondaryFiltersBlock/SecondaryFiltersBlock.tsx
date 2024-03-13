import { useEffect, useState } from "react";
import { Card, VStack, HStack, Button, Skeleton } from "@chakra-ui/react";

import { useHandledAsyncCallback } from "~/utils/hooks";
import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import { useMonitor } from "../../../useMonitor";
import { addFilterIds, filtersAreEqual, useFilters } from "~/components/Filters/useFilters";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";
import TextSwitch from "./TextSwitch";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { LabelText } from "../styledText";
import { SECONDARY_FILTERS_URL_KEY } from "../constants";

const secondaryFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input, label: "Request" },
  { type: "text", field: GeneralFiltersDefaultFields.Output, label: "Response" },
];

const SecondaryFiltersBlock = () => {
  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.filter.config.filters;
  const savedSampleRate = useMonitor().data?.config.sampleRate;
  const savedMaxOutputSize = useMonitor().data?.config.maxOutputSize;

  const { filters, setFilters } = useFilters({ urlKey: SECONDARY_FILTERS_URL_KEY });

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

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
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

export default SecondaryFiltersBlock;
