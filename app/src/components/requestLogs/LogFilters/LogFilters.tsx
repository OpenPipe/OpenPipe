import { VStack, Text } from "@chakra-ui/react";

import AddFilterButton from "./AddFilterButton";
import { useAppStore } from "~/state/store";
import LogFilter from "./LogFilter";

const LogFilters = () => {
  const filters = useAppStore((s) => s.logFilters.filters);
  return (
    <VStack
      bgColor="white"
      borderRadius={8}
      borderWidth={1}
      w="full"
      alignItems="flex-start"
      p={4}
      spacing={4}
    >
      <Text fontWeight="bold" color="gray.500">
        Filters
      </Text>
      {filters.map((filter) => (
        <LogFilter key={filter.id} filter={filter} />
      ))}
      <AddFilterButton />
    </VStack>
  );
};

export default LogFilters;
