import { VStack, Heading } from "@chakra-ui/react";
import InitialFiltersBlock from "./InitialFiltersBlock";
import InitialResultsBlock from "./InitialResultsBlock";
import SecondaryFiltersBlock from "./SecondaryFiltersBlock";
import RelabelingBlock from "./RelabelingBlock";
import DatasetsBlock from "./DatasetsBlock/DatasetsBlock";

const General = () => {
  return (
    <VStack w="full" alignItems="flex-start" spacing={12} pb={16}>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Initial Filters</Heading>
        <InitialFiltersBlock />
      </VStack>
      <InitialResultsBlock />
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Secondary Filters</Heading>
        <SecondaryFiltersBlock />
      </VStack>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Relabeling</Heading>
        <RelabelingBlock />
      </VStack>
      <VStack w="full" alignItems="flex-start">
        <Heading size="md">Datasets</Heading>
        <DatasetsBlock />
      </VStack>
    </VStack>
  );
};

export default General;
