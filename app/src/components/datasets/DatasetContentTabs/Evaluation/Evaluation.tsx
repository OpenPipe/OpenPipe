import { VStack, Box } from "@chakra-ui/react";

import EvaluationTable from "./EvaluationTable/EvaluationTable";

const Evaluation = () => {
  return (
    <VStack h="full">
      <Box w="100%" overflowX="auto" flex={1} id="box">
        <EvaluationTable />
      </Box>
    </VStack>
  );
};

export default Evaluation;
