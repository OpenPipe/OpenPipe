import { Box } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

const defaultFilterOptions = [
  { field: GeneralFiltersDefaultFields.Input },
  { field: GeneralFiltersDefaultFields.Output },
  { field: GeneralFiltersDefaultFields.ImportId },
  { field: GeneralFiltersDefaultFields.RelabelBatchId },
];

const GeneralFilters = () => {
  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={defaultFilterOptions} />
    </Box>
  );
};

export default GeneralFilters;
