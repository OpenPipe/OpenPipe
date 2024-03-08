import { VStack, HStack, Box, Text } from "@chakra-ui/react";

import { useFilters } from "~/components/Filters/useFilters";
import ToggleFiltersButton from "~/components/ToggleFiltersButton";
import { useTestingEntries } from "~/utils/hooks";

import FieldComparisonModal from "./ComparisonModals/FieldComparisonModal";
import HeadToHeadComparisonModal from "./ComparisonModals/HeadToHeadComparisonModal";
import EvaluationFilters from "./EvaluationFilters";
import EvaluationPaginator from "./EvaluationTable/EvaluationPaginator";
import EvaluationTable from "./EvaluationTable/EvaluationTable";
import EvalVisibilityDropdown from "./EvalVisibilityDropdown";
import ModelVisibilityDropdown from "./ModelVisibilityDropdown";





const Evaluation = () => {
  const filtersShown = useFilters().filtersShown;
  const filtersApplied = useFilters().filters.length > 0;

  const count = useTestingEntries().data?.count;

  return (
    <>
      <VStack px={8} position="sticky" left={0} w="full" alignItems="flex-start" pb={4} zIndex={5}>
        <HStack w="full">
          <ModelVisibilityDropdown />
          <EvalVisibilityDropdown />
          <ToggleFiltersButton />
        </HStack>
        {filtersShown && <EvaluationFilters />}
        <Text fontWeight="bold" fontSize="lg" pt={8}>
          {filtersApplied && "Matching "}Test Set Entries{" "}
          {count !== undefined ? `(${count.toLocaleString()})` : ""}
        </Text>
      </VStack>
      <Box w="full" flex={1}>
        <EvaluationTable />
      </Box>
      <Box px={8} position="sticky" left={0} w="full">
        <EvaluationPaginator py={8} />
      </Box>
      <FieldComparisonModal />
      <HeadToHeadComparisonModal />
    </>
  );
};

export default Evaluation;
