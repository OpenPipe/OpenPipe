import { Box } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";

const defaultFilterOptions = ["Input", "Output"];

const GeneralFilters = () => {
  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={defaultFilterOptions} />
    </Box>
  );
};

export default GeneralFilters;
