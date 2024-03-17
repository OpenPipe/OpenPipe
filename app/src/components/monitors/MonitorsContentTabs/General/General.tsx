import { VStack, Heading } from "@chakra-ui/react";

import InitialFiltersBlock from "./InitialFiltersBlock/InitialFiltersBlock";
import InitialResultsBlock from "./InitialResultsBlock";
import SecondaryFiltersBlock from "./SecondaryFiltersBlock/SecondaryFiltersBlock";
import DatasetsBlock from "./DatasetsBlock/DatasetsBlock";
import SecondaryResultsBlock from "./SecondaryResultsBlock/SecondaryResultsBlock";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start" spacing={12} pb={16}>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Rows to Check</Heading>
        <InitialFiltersBlock />
      </VStack>
      <InitialResultsBlock />
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Checks to Run</Heading>
        <SecondaryFiltersBlock />
      </VStack>
      <SecondaryResultsBlock />
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Connected Datasets</Heading>
        <DatasetsBlock />
      </VStack>
    </VStack>
  );
};

export default General;
