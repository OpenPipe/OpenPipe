import { Box } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

const defaultFilterOptions = [
  GeneralFiltersDefaultFields.Input,
  GeneralFiltersDefaultFields.Output,
];

const GeneralFilters = () => {
  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={defaultFilterOptions} />
    </Box>
  );
};

export default GeneralFilters;
