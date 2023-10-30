import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { debounce } from "lodash-es";
import SelectFieldDropdown from "../SelectFieldDropdown";
import SelectComparatorDropdown from "../SelectComparatorDropdown";
import { useFilters } from "../useFilters";
import { type FilterOptionType, type FilterDataType } from "../types";
import { type AtLeastOne } from "~/types/shared.types";

const TextFilter = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOptionType>;
  filter: FilterDataType;
}) => {
  const updateFilter = useFilters().updateFilter;
  const removeFilter = useFilters().removeFilter;

  const [editedValue, setEditedValue] = useState(filter.value as string);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterDataType) => updateFilter(filter), 500, {
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
