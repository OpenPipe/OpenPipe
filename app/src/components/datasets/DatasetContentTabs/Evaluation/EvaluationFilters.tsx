import { Box } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";

const defaultFilterOptions = ["Input", "Original Output"];

const EvaluationFilters = () => {
  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={defaultFilterOptions} />
    </Box>
  );
};

export default EvaluationFilters;
