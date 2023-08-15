import { useCallback, useState } from "react";
import { HStack, IconButton, Input } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { debounce } from "lodash-es";
import SelectFieldDropdown from "./SelectFieldDropdown";
import SelectComparatorDropdown from "./SelectComparatorDropdown";

const LogFilter = ({ filter, index }: { filter: LogFilter; index: number }) => {
  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);
  const deleteFilter = useAppStore((s) => s.logFilters.deleteFilter);

  const [editedValue, setEditedValue] = useState("");

  const debouncedUpdateFilter = useCallback(
    debounce((index: number, filter: LogFilter) => updateFilter(index, filter), 500, {
      leading: true,
    }),
    [updateFilter],
  );

  return (
    <HStack>
      <SelectFieldDropdown filter={filter} index={index} />
      <SelectComparatorDropdown filter={filter} index={index} />
      <Input
        value={editedValue}
        onChange={(e) => {
          setEditedValue(e.target.value);
          debouncedUpdateFilter(index, { ...filter, value: e.target.value });
        }}
      />
      <IconButton
        aria-label="Delete Filter"
        icon={<BsTrash />}
        onClick={() => deleteFilter(index)}
      />
    </HStack>
  );
};

export default LogFilter;
