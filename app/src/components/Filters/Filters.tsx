import { VStack, Text, Card } from "@chakra-ui/react";

import AddFilterButton from "../Filters/AddFilterButton";
import Filter from "./Filter";
import { useFilters } from "./useFilters";

const Filters = ({ filterOptions }: { filterOptions: string[] }) => {
  const filters = useFilters().filters;

  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        {filters.map((filter) => (
          <Filter key={filter.id} filterOptions={filterOptions} filter={filter} />
        ))}
        <AddFilterButton filterOptions={filterOptions} />
      </VStack>
    </Card>
  );
};

export default Filters;
