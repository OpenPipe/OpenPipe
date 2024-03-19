import { useEffect, useMemo } from "react";
import { Card, Text, VStack, HStack, Button, Skeleton } from "@chakra-ui/react";
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

const defaultMonitorSQLFilterOptions: FilterOption[] = [
  { type: "text", field: LoggedCallsFiltersDefaultFields.Request, label: "Request" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Response, label: "Response" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.CompletionId, label: "Completion Id" },
  { type: "date", field: LoggedCallsFiltersDefaultFields.SentAt, label: "Sent At" },
];

export const INITIAL_FILTERS_URL_KEY = "initial";

const InitialFilters = () => {
  const tagNames = useSelectedProject().data?.tagNames;

  const fineTunes = useFineTunes().data?.fineTunes;

  const monitor = useMonitor().data;
  const savedFilters = useMonitor().data?.config.initialFilters;

  const { filters, setFilters } = useFilters({ urlKey: INITIAL_FILTERS_URL_KEY });
  const [modelFilter, statusFilter, ...otherFilters] = filters;

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
            value: fineTunes[0].slug,
          },
          {
            id: uuidv4(),
            field: LoggedCallsFiltersDefaultFields.StatusCode,
            comparator: "=",
            value: "200",
          },
        ]);
      }
    }
  }, [fineTunes, savedFilters, filters, setFilters]);

  const noChanges = !savedFilters || filtersAreEqual(filters, savedFilters);

  const saveDisabled = !monitor || !filters.length || !modelFilter?.value || noChanges;

  const projectUpdateMutation = api.monitors.update.useMutation();

  const utils = api.useUtils();

  const [updateMonitor, updatingMonitor] = useHandledAsyncCallback(async () => {
    if (saveDisabled) return;

    await projectUpdateMutation.mutateAsync({
      id: monitor?.id,
      updates: {
        initialFilters: filters,
      },
    });

    toast({
      description: "Primary filters updated",
      status: "success",
    });

    await utils.monitors.list.invalidate();
    await utils.monitors.get.invalidate({ id: monitor?.id });
  }, [projectUpdateMutation, utils, saveDisabled, monitor?.id, filters]);

  const filterOptions = useMemo(() => {
    const tagFilterOptions: FilterOption[] = (tagNames || []).map((tag) => ({
      type: "text",
      field: `tags.${tag}`,
      label: tag,
    }));
    return [...defaultMonitorSQLFilterOptions, ...tagFilterOptions];
  }, [tagNames]);

  const isLoaded = !!modelFilter && !!statusFilter && !!fineTunes;

  return (
    <Card w="full">
      <Skeleton isLoaded={isLoaded}>
        <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
          <VStack alignItems="flex-start">
            <Text fontWeight="bold" color="gray.500">
              Model
            </Text>
            {isLoaded && (
              <InputDropdown
                options={fineTunes.map((fineTune) => `openpipe:${fineTune.slug}`)}
                selectedOption={modelFilter.value}
                onSelect={(value) => {
                  setFilters([{ ...modelFilter, value }, statusFilter, ...otherFilters]);
                }}
                maxPopoverContentHeight={400}
                minItemHeight={10}
                placeholder="Select model"
                inputGroupProps={{ minW: 300 }}
              />
            )}
          </VStack>
          <Text fontWeight="bold" color="gray.500">
            Filters
          </Text>
          <FilterContents
            filters={otherFilters}
            filterOptions={filterOptions}
            urlKey={INITIAL_FILTERS_URL_KEY}
          />
          <HStack w="full" justifyContent="flex-end">
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

export default InitialFilters;
