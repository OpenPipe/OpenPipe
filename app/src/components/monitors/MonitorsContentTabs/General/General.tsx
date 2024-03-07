import { VStack, Heading } from "@chakra-ui/react";
import InitialFilters from "./InitialFilters";
import InitialResults from "./InitialResults";
import SecondaryFilters from "./SecondaryFilters";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start" pb={16}>
      <Heading size="md">Initial Filters</Heading>
      <InitialFilters />
      <InitialResults />
      <Heading size="md">Secondary Filters</Heading>
      <SecondaryFilters />
    </VStack>
  );
};

export default General;
