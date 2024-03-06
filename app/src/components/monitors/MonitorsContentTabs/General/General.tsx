import { VStack, Heading } from "@chakra-ui/react";
import PrimaryFilters from "./PrimaryFilters";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start">
      <Heading size="md">Initial Filters</Heading>
      <PrimaryFilters />
    </VStack>
  );
};

export default General;
