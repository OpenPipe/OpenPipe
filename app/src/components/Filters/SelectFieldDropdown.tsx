import { useMemo } from "react";

import InputDropdown from "~/components/InputDropdown";
import { useFilters } from "./useFilters";
import { type FilterDataType, comparatorsForFilterType, type FilterOptionType } from "./types";
import { type AtLeastOne } from "~/types/shared.types";

const SelectFieldDropdown = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOptionType>;
  filter: FilterDataType;
}) => {
  const updateFilter = useFilters().updateFilter;

  const { field } = filter;

  const selectedOption = useMemo(() => {
    return filterOptions.find((option) => option.field === field);
  }, [field, filterOptions]);

  const updateFieldSelection = (option: FilterOptionType) => {
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
      getDisplayLabel={(option) => option.field}
      selectedOption={selectedOption}
      onSelect={updateFieldSelection}
    />
  );
};

export default SelectFieldDropdown;
