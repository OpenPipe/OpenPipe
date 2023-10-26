import { VStack, Text, Card } from "@chakra-ui/react";

import AddFilterButton from "./AddFilterButton";
import { useAppStore } from "~/state/store";
import LogFilter from "./LogFilter";

const LogFilters = () => {
  const filters = useAppStore((s) => s.logFilters.filters);
  return (
    <Card w="full">
      <VStack alignItems="flex-start" padding={4} spacing={4} w="full">
        <Text fontWeight="bold" color="gray.500">
          Filters
        </Text>
        {filters.map((filter) => (
          <LogFilter key={filter.id} filter={filter} />
        ))}
        <AddFilterButton />
      </VStack>
    </Card>
  );
};

export default LogFilters;
