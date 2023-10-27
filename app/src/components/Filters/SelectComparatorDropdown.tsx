import InputDropdown from "~/components/InputDropdown";
import { type FilterType, useFilters, comparators } from "./useFilters";

const SelectComparatorDropdown = ({ filter }: { filter: FilterType }) => {
  const updateFilter = useFilters().updateFilter;

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
