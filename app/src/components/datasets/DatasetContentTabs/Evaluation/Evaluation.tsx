import { HStack, Box } from "@chakra-ui/react";

import EvaluationTable from "./EvaluationTable/EvaluationTable";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";

const Evaluation = () => {
  return (
    <>
      <HStack
        px={8}
        position="sticky"
        left={0}
        w="full"
        justifyContent="flex-start"
        pb={4}
        zIndex={5}
      >
        <ColumnVisibilityDropdown />
      </HStack>
      <Box w="full" flex={1}>
        <EvaluationTable />
      </Box>
    </>
  );
};

export default Evaluation;
