import { useEffect, useMemo } from "react";
import { Card, Text, VStack } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";

import { useFineTunes, useSelectedProject } from "~/utils/hooks";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";
import InputDropdown from "~/components/InputDropdown";
import { useMonitor } from "../../useMonitor";
import { useFilters } from "~/components/Filters/useFilters";

const defaultFilterOptions: FilterOption[] = [
  { type: "text", field: LoggedCallsFiltersDefaultFields.Request, label: "Request" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Response, label: "Response" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.StatusCode, label: "Status Code" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.CompletionId, label: "Completion Id" },
];

const URL_KEY = "pre";

const PreliminaryFilters = () => {
  const tagNames = useSelectedProject().data?.tagNames;

  const fineTunes = useFineTunes().data?.fineTunes;

  const savedFilters = useMonitor().data?.config.initialFilters;

  const { filters, setFilters } = useFilters({ urlKey: URL_KEY });

  useEffect(() => {
    if (!filters.length && savedFilters && fineTunes?.[0]) {
      if (savedFilters.length) {
        setFilters(savedFilters.map((filter) => ({ ...filter, id: uuidv4() })));
      } else {
        setFilters([
          {
            id: uuidv4(),
            field: LoggedCallsFiltersDefaultFields.Model,
            comparator: "=",
            value: fineTunes[0].slug,
          },
        ]);
      }
    }
  }, [fineTunes, savedFilters, filters, setFilters]);

  const filterOptions = useMemo(() => {
    const tagFilters: FilterOption[] = (tagNames || []).map((tag) => ({
      type: "text",
      field: `tags.${tag}`,
      label: tag,
    }));
    return [...defaultFilterOptions, ...tagFilters];
  }, [tagNames]);

  const [modelFilter, ...otherFilters] = filters;

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
        />
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        <FilterContents filters={otherFilters} filterOptions={filterOptions} urlKey={URL_KEY} />
      </VStack>
    </Card>
  );
};

export default PreliminaryFilters;
