import { useState } from "react";
import { VStack, HStack, Box } from "@chakra-ui/react";
import { FiFilter } from "react-icons/fi";

import EvaluationTable from "./EvaluationTable/EvaluationTable";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import ActionButton from "~/components/ActionButton";
import Filters from "~/components/Filters/Filters";

const defaultFilterOptions = ["input"];

const Evaluation = () => {
  const [filtersShown, setFiltersShown] = useState(true);

  return (
    <>
      <VStack
        px={8}
        position="sticky"
        left={0}
        w="full"
        justifyContent="flex-start"
        pb={4}
        zIndex={5}
      >
        <HStack w="full">
          <ColumnVisibilityDropdown />
          <ActionButton
            onClick={() => {
              setFiltersShown(!filtersShown);
            }}
            label={filtersShown ? "Hide Filters" : "Show Filters"}
            icon={FiFilter}
          />
        </HStack>
        <Filters filterOptions={defaultFilterOptions} />
      </VStack>
      <Box w="full" flex={1}>
        <EvaluationTable />
      </Box>
    </>
  );
};

export default Evaluation;
