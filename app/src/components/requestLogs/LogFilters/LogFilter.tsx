import { HStack, IconButton, Input, Select } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import { type LogFilter, comparators } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { useFilterableFields } from "~/utils/hooks";

const LogFilter = ({ filter, index }: { filter: LogFilter; index: number }) => {
  const filterableFields = useFilterableFields();

  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);
  const deleteFilter = useAppStore((s) => s.logFilters.deleteFilter);

  const { field, comparator, value } = filter;

  return (
    <HStack>
      <Select
        value={field}
        onChange={(e) => updateFilter(index, { ...filter, field: e.target.value })}
      >
        {filterableFields.data?.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </Select>
      <Select
        value={comparator}
        onChange={(e) =>
          updateFilter(index, {
            ...filter,
            comparator: e.target.value as (typeof comparators)[number],
          })
        }
      >
        {comparators.map((comparator) => (
          <option key={comparator} value={comparator}>
            {comparator}
          </option>
        ))}
      </Select>
      <Input
        value={value}
        onChange={(e) => updateFilter(index, { ...filter, value: e.target.value })}
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
