import { useEffect } from "react";
import InputDropdown from "~/components/InputDropdown";
import { useFilters } from "./useFilters";
import { type FilterData, comparatorsForFilterType, type FilterType } from "./types";
import { type comparators } from "~/types/shared.types";

const SelectComparatorDropdown = ({
  filter,
  filterType,
}: {
  filter: FilterData;
  filterType: FilterType;
}) => {
  const updateFilter = useFilters().updateFilter;

  const comparators = comparatorsForFilterType(filterType);

  const { comparator } = filter;

  useEffect(() => {
    if (!comparators.includes(comparator)) {
      updateFilter({ ...filter, comparator: comparators[0] });
    }
  }, [comparator, comparators, filter, updateFilter]);

  return (
    <InputDropdown
      options={comparators}
      selectedOption={comparator}
      getDisplayLabel={getComparatorLabel}
      onSelect={(option) => updateFilter({ ...filter, comparator: option })}
    />
  );
};

const getComparatorLabel = (comparator: (typeof comparators)[number]) => {
  switch (comparator) {
    case "CONTAINS":
      return "Contains";
    case "NOT_CONTAINS":
      return "Does not contain";
    default:
      return comparator;
  }
};

export default SelectComparatorDropdown;
