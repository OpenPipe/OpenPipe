import { useEffect } from "react";
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
import { BlockProcessingIndicator } from "../BlockProcessingIndicator";

const secondaryFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input, label: "Request" },
  { type: "text", field: GeneralFiltersDefaultFields.Output, label: "Response" },
];

const SecondaryFiltersBlock = () => {
  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.filter.config.filters;
  const checksProcessing = useMonitor().data?.filter.status === "PROCESSING";

  const { filters, setFilters } = useFilters({ urlKey: SECONDARY_FILTERS_URL_KEY });

  useEffect(() => {
    if (savedFilters) setFilters(addFilterIds(savedFilters));
  }, [savedFilters]);

  const noChanges = !savedFilters || filtersAreEqual(filters, savedFilters);

  const saveDisabled = !monitor || noChanges;

  const utils = api.useUtils();

  const monitorUpdateMutation = api.monitors.update.useMutation();
  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await monitorUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        checkFilters: filters,
      },
    });

    toast({
      description: "Secondary filters updated",
      status: "success",
    });

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [monitorUpdateMutation, utils, saveDisabled, monitor?.id, filters]);

  const isLoaded = !!savedFilters;

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
            <BlockProcessingIndicator isProcessing={checksProcessing} />
            <Button
              onClick={() => {
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
