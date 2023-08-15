import { VStack, Text } from "@chakra-ui/react";

import AddFilterButton from "./AddFilterButton";
import { useAppStore } from "~/state/store";
import LogFilter from "./LogFilter";

const LogFilters = () => {
  const filters = useAppStore((s) => s.logFilters.filters);
  return (
    <VStack bgColor="white" borderRadius={8} borderWidth={1} w="full" alignItems="flex-start" p={4}>
      <Text>Filters</Text>
      {filters.map((filter, index) => (
        <LogFilter key={index} filter={filter} index={index} />
      ))}
      <AddFilterButton />
    </VStack>
  );
};

export default LogFilters;
