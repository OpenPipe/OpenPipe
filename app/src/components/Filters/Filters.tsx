import { VStack, Text, Card } from "@chakra-ui/react";

import AddFilterButton from "../Filters/AddFilterButton";
import Filter from "./Filter/index";
import { useFilters } from "./useFilters";
import { type FilterData, type FilterOption } from "./types";
import { type AtLeastOne } from "~/types/shared.types";

const Filters = ({ filterOptions }: { filterOptions: FilterOption[] }) => {
  const filters = useFilters().filters;

  if (!filterOptions.length) return null;

  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        <FilterContents filters={filters} filterOptions={filterOptions} />
      </VStack>
    </Card>
  );
};

export default Filters;

export const FilterContents = ({
  filters,
  filterOptions,
  urlKey,
}: {
  filters: FilterData[];
  filterOptions: FilterOption[];
  urlKey?: string;
}) => {
  const typedFilterOptions = filterOptions as unknown as AtLeastOne<FilterOption>;
  return (
    <>
      {filters.map((filter) => (
        <Filter
          key={filter.id}
          filterOptions={typedFilterOptions}
          filter={filter}
          urlKey={urlKey}
        />
      ))}
      <AddFilterButton filterOptions={typedFilterOptions} urlKey={urlKey} />
    </>
  );
};
