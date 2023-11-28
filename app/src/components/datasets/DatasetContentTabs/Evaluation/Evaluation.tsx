import { useEffect } from "react";
import { VStack, HStack, Box, Text } from "@chakra-ui/react";
import { FiFilter } from "react-icons/fi";

import EvaluationTable from "./EvaluationTable/EvaluationTable";
import ModelVisibilityDropdown from "./ModelVisibilityDropdown";
import ActionButton from "~/components/ActionButton";
import EvaluationFilters from "./EvaluationFilters";
import { useTestingEntries } from "~/utils/hooks";
import EvaluationPaginator from "./EvaluationTable/EvaluationPaginator";
import { useFilters } from "~/components/Filters/useFilters";
import EvalVisibilityDropdown from "./EvalVisibilityDropdown";
import HeadToHeadComparisonModal from "./ComparisonModals/HeadToHeadComparisonModal";
import FieldComparisonModal from "./ComparisonModals/FieldComparisonModal";
import EditEvalModal from "./EditEvalModal";

const Evaluation = () => {
  const filters = useFilters().filters;
  const filtersShown = useFilters().filtersShown;
  const setFiltersShown = useFilters().setFiltersShown;

  useEffect(() => {
    if (filters.length) setFiltersShown(true);
  }, [filters.length, setFiltersShown]);

  const count = useTestingEntries().data?.count;

  return (
    <>
      <VStack px={8} position="sticky" left={0} w="full" alignItems="flex-start" pb={4} zIndex={5}>
        <HStack w="full">
          <ModelVisibilityDropdown />
          <EvalVisibilityDropdown />
          <ActionButton
            onClick={() => {
              setFiltersShown(!filtersShown);
            }}
            label={filtersShown ? "Hide Filters" : "Show Filters"}
            icon={FiFilter}
          />
        </HStack>
        {filtersShown && <EvaluationFilters />}
        <Text fontWeight="bold" fontSize="lg" pt={8}>
          Results {count !== undefined ? `(${count})` : ""}
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
      <EditEvalModal />
    </>
  );
};

export default Evaluation;
