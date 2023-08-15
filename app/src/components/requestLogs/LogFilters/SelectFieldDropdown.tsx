import { type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { useFilterableFields } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";

const SelectFieldDropdown = ({ filter, index }: { filter: LogFilter; index: number }) => {
  const filterableFields = useFilterableFields().data;

  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);

  const { field } = filter;

  return (
    <InputDropdown
      options={filterableFields || []}
      selectedOption={field}
      onSelect={(option) => updateFilter(index, { ...filter, field: option })}
    />
  );
};

export default SelectFieldDropdown;
