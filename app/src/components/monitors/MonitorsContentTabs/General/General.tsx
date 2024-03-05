import { VStack, Heading } from "@chakra-ui/react";
import PreliminaryFilters from "./PreliminaryFilters";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start">
      <Heading size="md">Preliminary Filters</Heading>
      <PreliminaryFilters />
    </VStack>
  );
};

export default General;
