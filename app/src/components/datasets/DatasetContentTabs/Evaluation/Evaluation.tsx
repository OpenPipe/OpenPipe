import { VStack, Box } from "@chakra-ui/react";

import EvaluationTable from "./EvaluationTable/EvaluationTable";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";

const Evaluation = () => {
  return (
    <VStack h="full">
      <Box alignSelf="flex-start" px={8}>
        <ColumnVisibilityDropdown />
      </Box>
      <Box w="full" flex={1}>
        <EvaluationTable />
      </Box>
    </VStack>
  );
};

export default Evaluation;
