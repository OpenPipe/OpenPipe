import { VStack, Heading } from "@chakra-ui/react";
import InitialFiltersBlock from "./InitialFiltersBlock/InitialFiltersBlock";
import InitialResultsBlock from "./InitialResultsBlock";
import SecondaryFiltersBlock from "./SecondaryFiltersBlock/SecondaryFiltersBlock";
import RelabelingBlock from "./RelabelingBlock";
import DatasetsBlock from "./DatasetsBlock/DatasetsBlock";

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
