import { useState } from "react";
import { VStack, HStack, Box, Text } from "@chakra-ui/react";
import { FiFilter } from "react-icons/fi";

import EvaluationTable from "./EvaluationTable/EvaluationTable";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import ActionButton from "~/components/ActionButton";
import EvaluationFilters from "./EvaluationFilters";
import { useTestingEntries } from "~/utils/hooks";
import EvaluationPaginator from "./EvaluationTable/EvaluationPaginator";
import { useFilters } from "~/components/Filters/useFilters";
import EvalVisibilityDropdown from "./EvalVisibilityDropdown";
import OutputEvaluationDetailsModal from "./OutputEvaluationDetailsModal";

const Evaluation = () => {
  const filters = useFilters().filters;
  const [filtersShown, setFiltersShown] = useState(filters.length > 0);

  const count = useTestingEntries().data?.count;

  return (
    <>
      <VStack px={8} position="sticky" left={0} w="full" alignItems="flex-start" pb={4} zIndex={5}>
        <HStack w="full">
          <ColumnVisibilityDropdown />
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
      <OutputEvaluationDetailsModal />
    </>
  );
};

export default Evaluation;
