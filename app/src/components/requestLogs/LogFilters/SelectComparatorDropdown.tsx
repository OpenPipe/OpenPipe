import { comparators, type LogFilter } from "~/state/logFiltersSlice";
import { useAppStore } from "~/state/store";
import InputDropdown from "~/components/InputDropdown";

const SelectComparatorDropdown = ({ filter, index }: { filter: LogFilter; index: number }) => {
  const updateFilter = useAppStore((s) => s.logFilters.updateFilter);

  const { comparator } = filter;

  return (
    <InputDropdown
      options={comparators}
      selectedOption={comparator}
      onSelect={(option) => updateFilter(index, { ...filter, comparator: option })}
      inputGroupProps={{ w: 300 }}
    />
  );
};

export default SelectComparatorDropdown;
