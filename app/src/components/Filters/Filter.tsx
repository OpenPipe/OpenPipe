import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { debounce } from "lodash-es";
import SelectFieldDropdown from "./SelectFieldDropdown";
import SelectComparatorDropdown from "./SelectComparatorDropdown";
import { useFilters, type FilterData } from "./useFilters";

const Filter = ({ filterOptions, filter }: { filterOptions: string[]; filter: FilterData }) => {
  const updateFilter = useFilters().updateFilter;
  const deleteFilter = useFilters().deleteFilter;

  const [editedValue, setEditedValue] = useState(filter.value);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterData) => updateFilter(filter), 500, {
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
        aria-label="Delete Filter"
        icon={<BsTrash />}
        onClick={() => deleteFilter(filter.id)}
      />
    </HStack>
  );
};

export default Filter;
