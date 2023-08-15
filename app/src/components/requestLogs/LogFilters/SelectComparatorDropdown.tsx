import { comparators, type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import InputDropdown from "~/components/InputDropdown";

const SelectComparatorDropdown = ({ filter }: { filter: LogFilter }) => {
  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);

  const { comparator } = filter;

  return (
    <InputDropdown
      options={comparators}
      selectedOption={comparator}
      onSelect={(option) => updateFilter({ ...filter, comparator: option })}
    />
  );
};

export default SelectComparatorDropdown;
