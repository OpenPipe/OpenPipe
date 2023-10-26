import InputDropdown from "~/components/InputDropdown";
import { type FilterData, useFilters, comparators } from "./useFilters";

const SelectComparatorDropdown = ({ filter }: { filter: FilterData }) => {
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
