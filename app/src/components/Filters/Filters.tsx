import { VStack, Text, Card } from "@chakra-ui/react";

import AddFilterButton from "../Filters/AddFilterButton";
import Filter, { type FilterData } from "./Filter";

const Filters = ({ filters }: { filters: FilterData[] }) => {
  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        {filters.map((filter) => (
          <Filter key={filter.id} filter={filter} />
        ))}
        <AddFilterButton />
      </VStack>
    </Card>
  );
};

export default Filters;
