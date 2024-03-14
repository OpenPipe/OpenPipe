import { useCallback, useEffect } from "react";
import { Card, VStack, HStack, Button, Skeleton } from "@chakra-ui/react";

import { useFineTunes, useHandledAsyncCallback } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";
import { useMonitor } from "../../../useMonitor";
import { filtersAreEqual } from "~/components/Filters/useFilters";
import { toast } from "~/theme/ChakraThemeProvider";
import { api } from "~/utils/api";
import { formatFTSlug } from "~/utils/utils";
import { LabelText } from "../styledText";
import { useInitialFilters } from "./useInitialFilters";
import InitialFilterContents from "./InitialFilterContents";
import SampleInputs from "./SampleInputs";
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";

const InitialFiltersBlock = () => {
  const fineTunes = useFineTunes().data?.fineTunes;

  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.config.initialFilters;
  const savedSampleRate = useMonitor().data?.config.sampleRate;
  const savedMaxOutputSize = useMonitor().data?.config.maxOutputSize;
  const monitorProcessing = useMonitor().data?.status === "PROCESSING";

  const { modelFilter, sampleRateFilter, maxOutputSizeFilter, saveableFilters, updateFilters } =
    useInitialFilters();

  const initializeFilters = useCallback(() => {
    if (!savedFilters || !fineTunes?.[0]) return;

    if (savedFilters.length) {
      updateFilters({
        startingFilters: savedFilters,
        sampleRate: savedSampleRate,
        maxOutputSize: savedMaxOutputSize,
      });
    } else {
      updateFilters({
        model: formatFTSlug(fineTunes[0].slug),
        statusCode: "200",
        sampleRate: savedSampleRate,
        maxOutputSize: savedMaxOutputSize,
      });
    }
  }, [fineTunes, savedFilters, savedSampleRate, savedMaxOutputSize, updateFilters]);

  useEffect(() => {
    if (!modelFilter && savedFilters && savedSampleRate && savedMaxOutputSize && fineTunes?.[0]) {
      initializeFilters();
    }
  }, [
    fineTunes,
    savedFilters,
    savedSampleRate,
    savedMaxOutputSize,
    modelFilter,
    initializeFilters,
  ]);

  const sampleRate = parseFloat(sampleRateFilter?.value as string);
  const maxOutputSize = parseFloat(maxOutputSizeFilter?.value as string);

  const noChanges =
    (!savedFilters || filtersAreEqual(saveableFilters, savedFilters)) &&
    sampleRate === savedSampleRate &&
    maxOutputSize === savedMaxOutputSize;

  const saveDisabled =
    !monitor || !saveableFilters.length || !modelFilter?.value || !sampleRate || noChanges;

  const utils = api.useUtils();

  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await monitorUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        initialFilters: saveableFilters,
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
  }, [
    monitorUpdateMutation,
    utils,
    saveDisabled,
    monitor?.id,
    saveableFilters,
    sampleRate,
    maxOutputSize,
  ]);

  const isLoaded = !!modelFilter && !!fineTunes;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <VStack alignItems="flex-start">
            <LabelText>Model</LabelText>
            {isLoaded && (
              <InputDropdown
                options={fineTunes.map((fineTune) => formatFTSlug(fineTune.slug))}
                selectedOption={modelFilter.value}
                onSelect={(value) => updateFilters({ model: value as string })}
                maxPopoverContentHeight={400}
                minItemHeight={10}
                placeholder="Select model"
                inputGroupProps={{ minW: 300 }}
              />
            )}
          </VStack>
          <LabelText>Filters</LabelText>
          <InitialFilterContents />
          {sampleRateFilter && maxOutputSizeFilter && (
            <SampleInputs
              sampleRate={sampleRate}
              maxOutputSize={maxOutputSize}
              setSampleRate={(value) => updateFilters({ sampleRate: value })}
              setMaxOutputSize={(value) => updateFilters({ maxOutputSize: value })}
            />
          )}
          <HStack w="full" justifyContent="flex-end">
            <BlockProcessingIndicator isProcessing={monitorProcessing} />
            <Button onClick={() => initializeFilters()} isDisabled={noChanges || updatingMonitor}>
              Reset
            </Button>
            <Button
              colorScheme="blue"
              isDisabled={saveDisabled}
              isLoading={updatingMonitor}
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

export default InitialFiltersBlock;
