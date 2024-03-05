import { useMemo } from "react";

import InputDropdown from "~/components/InputDropdown";
import { useFilters } from "./useFilters";
import { type FilterData, comparatorsForFilterType, type FilterOption } from "./types";
import { type AtLeastOne } from "~/types/shared.types";

const SelectFieldDropdown = ({
  filterOptions,
  filter,
  urlKey,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
  urlKey?: string;
}) => {
  const updateFilter = useFilters({ urlKey }).updateFilter;

  const { field } = filter;

  const selectedOption = useMemo(() => {
    return filterOptions.find((option) => option.field === field);
  }, [field, filterOptions]);

  const updateFieldSelection = (option: FilterOption) => {
    const optionTypeChanged = option.type !== selectedOption?.type;
    let comparator = filter.comparator;
    let value = filter.value;
    if (optionTypeChanged) {
      const newComparatorOptions = comparatorsForFilterType(option.type);
      comparator = newComparatorOptions[0];
      value = "";
    }

    updateFilter({ ...filter, field: option.field, comparator, value });
  };

  if (!selectedOption) {
    return null;
  }

  return (
    <InputDropdown
      options={filterOptions}
      getDisplayLabel={(option) => (!!option.label ? option.label : option.field)}
      selectedOption={selectedOption}
      onSelect={updateFieldSelection}
    />
  );
};

export default SelectFieldDropdown;
