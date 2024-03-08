import { VStack, Text, Card } from "@chakra-ui/react";

import { type AtLeastOne } from "~/types/shared.types";

import Filter from "./Filter/index";
import { type FilterOption } from "./types";
import { useFilters } from "./useFilters";
import AddFilterButton from "../Filters/AddFilterButton";


const Filters = ({ filterOptions }: { filterOptions: FilterOption[] }) => {
  const filters = useFilters().filters;

  if (!filterOptions.length) return null;

  const typedFilterOptions = filterOptions as unknown as AtLeastOne<FilterOption>;

  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        {filters.map((filter) => (
          <Filter key={filter.id} filterOptions={typedFilterOptions} filter={filter} />
        ))}
        <AddFilterButton filterOptions={typedFilterOptions} />
      </VStack>
    </Card>
  );
};

export default Filters;
