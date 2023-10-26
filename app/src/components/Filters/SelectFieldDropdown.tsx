import { defaultFilterableFields, type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import { useTagNames } from "~/utils/hooks";
import InputDropdown from "~/components/InputDropdown";

const SelectFieldDropdown = ({ filter }: { filter: LogFilter }) => {
  const tagNames = useTagNames().data;

  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);

  const { field } = filter;

  return (
    <InputDropdown
      options={[...defaultFilterableFields, ...(tagNames || [])]}
      selectedOption={field}
      onSelect={(option) => updateFilter({ ...filter, field: option })}
    />
  );
};

export default SelectFieldDropdown;
