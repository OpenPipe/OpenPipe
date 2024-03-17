import { Box, type BoxProps } from "@chakra-ui/react";

import Filters from "~/components/Filters/Filters";
import { type FilterOption } from "~/components/Filters/types";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";

const filterOptions: FilterOption[] = [
  { type: "text", field: GeneralFiltersDefaultFields.Input },
  { type: "text", field: GeneralFiltersDefaultFields.Output },
  {
    type: "select",
    field: GeneralFiltersDefaultFields.Split,
    options: [{ value: "TRAIN" }, { value: "TEST" }],
  },
];

const SimpleNodeEntryFilters = (props: BoxProps) => {
  return (
    <Box w="full" pt={1} {...props}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default SimpleNodeEntryFilters;
