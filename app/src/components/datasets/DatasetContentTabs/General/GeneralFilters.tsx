import { Box } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";
import { type FilterOption } from "~/components/Filters/types";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

const defaultFilterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input },
  { type: "text", field: GeneralFiltersDefaultFields.Output },
  { type: "text", field: GeneralFiltersDefaultFields.ImportId },
  { type: "text", field: GeneralFiltersDefaultFields.RelabelBatchId },
];

const GeneralFilters = () => {
  return (
    <Box w="full" pt={1}>
      <Filters filterOptions={defaultFilterOptions} />
    </Box>
  );
};

export default GeneralFilters;
