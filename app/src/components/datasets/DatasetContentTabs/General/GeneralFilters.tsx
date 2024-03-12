import { Box, type BoxProps } from "@chakra-ui/react";
import { useMemo } from "react";

import Filters from "~/components/Filters/Filters";
import { type FilterOption } from "~/components/Filters/types";
import { GeneralFiltersDefaultFields } from "~/types/shared.types";
import { useDatasetSources } from "~/utils/hooks";

const GeneralFilters = (props: BoxProps) => {
  const sources = useDatasetSources().data;

  const filterOptions = useMemo(() => {
    const filterOptions: FilterOption[] = [
      { type: "text", field: GeneralFiltersDefaultFields.Input },
      { type: "text", field: GeneralFiltersDefaultFields.Output },
      {
        type: "select",
        field: GeneralFiltersDefaultFields.Split,
        options: [{ value: "TRAIN" }, { value: "TEST" }],
      },
    ];

    if (sources?.length) {
      filterOptions.push({
        type: "select",
        field: GeneralFiltersDefaultFields.Source,
        options: sources.map((source) => ({
          value: source.id,
          label: source.name,
        })),
      });
    }
    return filterOptions;
  }, [sources]);

  return (
    <Box w="full" pt={1} {...props}>
      <Filters filterOptions={filterOptions} />
    </Box>
  );
};

export default GeneralFilters;
