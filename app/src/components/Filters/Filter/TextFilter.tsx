import { HStack, IconButton, Input } from "@chakra-ui/react";
import { debounce } from "lodash-es";
import { useCallback, useState } from "react";
import { BsTrash } from "react-icons/bs";

import { type AtLeastOne } from "~/types/shared.types";

import SelectComparatorDropdown from "../SelectComparatorDropdown";
import SelectFieldDropdown from "../SelectFieldDropdown";
import { type FilterOption, type FilterData } from "../types";
import { useFilters } from "../useFilters";


const TextFilter = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
}) => {
  const updateFilter = useFilters().updateFilter;
  const removeFilter = useFilters().removeFilter;

  const [editedValue, setEditedValue] = useState(filter.value as string);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterData) => updateFilter(filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  return (
    <HStack>
      <SelectFieldDropdown filterOptions={filterOptions} filter={filter} />
      <SelectComparatorDropdown filter={filter} filterType="text" />
      <Input
        value={editedValue}
        onChange={(e) => {
          setEditedValue(e.target.value);
          debouncedUpdateFilter({ ...filter, value: e.target.value });
        }}
        w={486}
      />
      <IconButton
        aria-label="Remove Filter"
        icon={<BsTrash />}
        onClick={() => removeFilter(filter)}
      />
    </HStack>
  );
};

export default TextFilter;
