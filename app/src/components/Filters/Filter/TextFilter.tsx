import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { debounce } from "lodash-es";
import SelectFieldDropdown from "../SelectFieldDropdown";
import SelectComparatorDropdown from "../SelectComparatorDropdown";
import { useFilters } from "../useFilters";
import { type FilterOption, type FilterData } from "../types";
import { type AtLeastOne } from "~/types/shared.types";

const TextFilter = ({
  filterOptions,
  filter,
  urlKey,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
  urlKey?: string;
}) => {
  const { updateFilter, removeFilter } = useFilters({ urlKey });

  const [editedValue, setEditedValue] = useState(filter.value as string);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: FilterData) => updateFilter(filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  return (
    <HStack>
      <SelectFieldDropdown filterOptions={filterOptions} filter={filter} urlKey={urlKey} />
      <SelectComparatorDropdown filter={filter} filterType="text" urlKey={urlKey} />
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
