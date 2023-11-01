import { VStack, Text, Card } from "@chakra-ui/react";

import AddFilterButton from "../Filters/AddFilterButton";
import Filter from "./Filter/index";
import { useFilters } from "./useFilters";
import { type FilterOptionType } from "./types";
import { type AtLeastOne } from "~/types/shared.types";

const Filters = ({ filterOptions }: { filterOptions: FilterOptionType[] }) => {
  const filters = useFilters().filters;

  if (!filterOptions.length) return null;

  const typedFilterOptions = filterOptions as unknown as AtLeastOne<FilterOptionType>;

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
