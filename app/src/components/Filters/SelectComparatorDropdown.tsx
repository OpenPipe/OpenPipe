import { useEffect } from "react";
import InputDropdown from "~/components/InputDropdown";
import { useFilters } from "./useFilters";
import { type FilterData, comparatorsForFilterType, type FilterType } from "./types";
import { type comparators } from "~/types/shared.types";

const SelectComparatorDropdown = ({
  filter,
  filterType,
  urlKey,
}: {
  filter: FilterData;
  filterType: FilterType;
  urlKey?: string;
}) => {
  const updateFilter = useFilters({ urlKey }).updateFilter;

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
    case "LAST 15M":
      return "Last 15 minutes";
    case "LAST 24H":
      return "Last 24 hours";
    case "LAST 7D":
      return "Last 7 days";
    case "BEFORE":
      return "Before";
    case "AFTER":
      return "After";
    case "RANGE":
      return "Range";
    default:
      return comparator;
  }
};

export default SelectComparatorDropdown;
