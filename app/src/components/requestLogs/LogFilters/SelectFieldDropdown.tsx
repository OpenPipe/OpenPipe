import { defaultFilterableFields, type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { useTagNames } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";

const SelectFieldDropdown = ({ filter, index }: { filter: LogFilter; index: number }) => {
  const tagNames = useTagNames().data;

  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);

  const { field } = filter;

  return (
    <InputDropdown
      options={[...defaultFilterableFields, ...(tagNames || [])]}
      selectedOption={field}
      onSelect={(option) => updateFilter(index, { ...filter, field: option })}
    />
  );
};

export default SelectFieldDropdown;
