import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { debounce } from "lodash-es";
import SelectFieldDropdown from "./SelectFieldDropdown";
import SelectComparatorDropdown from "./SelectComparatorDropdown";
import { useFilters, type FilterType } from "./useFilters";

const Filter = ({ filterOptions, filter }: { filterOptions: string[]; filter: FilterType }) => {
  const updateFilter = useFilters().updateFilter;
  const removeFilter = useFilters().removeFilter;

  const [editedValue, setEditedValue] = useState(filter.value);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterType) => updateFilter(filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  return (
    <HStack>
      <SelectFieldDropdown filterOptions={filterOptions} filter={filter} />
      <SelectComparatorDropdown filter={filter} />
      <Input
        value={editedValue}
        onChange={(e) => {
          setEditedValue(e.target.value);
          debouncedUpdateFilter({ ...filter, value: e.target.value });
        }}
      />
      <IconButton
        aria-label="Remove Filter"
        icon={<BsTrash />}
        onClick={() => removeFilter(filter)}
      />
    </HStack>
  );
};

export default Filter;
