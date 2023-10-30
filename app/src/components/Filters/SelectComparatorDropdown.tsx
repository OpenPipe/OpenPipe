import { useEffect } from "react";
import InputDropdown from "~/components/InputDropdown";
import { useFilters } from "./useFilters";
import { type FilterDataType, type FilterTypeType, comparatorsForFilterType } from "./types";

const SelectComparatorDropdown = ({
  filter,
  filterType,
}: {
  filter: FilterDataType;
  filterType: FilterTypeType;
}) => {
  const updateFilter = useFilters().updateFilter;

  const comparators = comparatorsForFilterType(filterType);

  const { comparator } = filter;

  useEffect(() => {
    if (!comparators.includes(comparator)) {
      updateFilter({ ...filter, comparator: comparators[0] as (typeof comparators)[number] });
    }
  }, [comparator, comparators, filter, updateFilter]);

  return (
    <InputDropdown
      options={comparators}
      selectedOption={comparator}
      onSelect={(option) => updateFilter({ ...filter, comparator: option })}
    />
  );
};

export default SelectComparatorDropdown;
