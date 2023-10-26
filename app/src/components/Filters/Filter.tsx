import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { debounce } from "lodash-es";
import SelectFieldDropdown from "./SelectFieldDropdown";
import SelectComparatorDropdown from "./SelectComparatorDropdown";

export const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

export interface FilterData {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string;
}

const Filter = ({ filter }: { filter: FilterData }) => {
  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);
  const deleteFilter = useAppStore((s) => s.logFilters.deleteFilter);

  const [editedValue, setEditedValue] = useState(filter.value);

  const debouncedUpdateFilter = useCallback(
    debounce((filter: LogFilter) => updateFilter(filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  return (
    <HStack>
      <SelectFieldDropdown filter={filter} />
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
