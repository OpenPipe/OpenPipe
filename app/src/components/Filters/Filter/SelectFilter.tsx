import { useMemo, useEffect, useCallback } from "react";
import { HStack, IconButton } from "@chakra-ui/react";
import { BsTrash } from "react-icons/bs";

import SelectFieldDropdown from "../SelectFieldDropdown";
import SelectComparatorDropdown from "../SelectComparatorDropdown";
import { useFilters } from "../useFilters";
import type { FilterOptionType, FilterDataType, FilterSelectOptionType } from "../types";
import { type AtLeastOne } from "~/types/shared.types";
import InputDropdown from "~/components/InputDropdown";

const SelectFilter = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOptionType>;
  filter: FilterDataType;
}) => {
  const updateFilter = useFilters().updateFilter;
  const removeFilter = useFilters().removeFilter;

  const filterOption = useMemo(() => {
    return filterOptions.find((option) => option.field === filter.field);
  }, [filter.field, filterOptions]);

  const selectedSelectFilterOption = useMemo(() => {
    const selectOptions = filterOption?.options || [];
    return selectOptions.find((option) => option.value === filter.value) || selectOptions[0];
  }, [filterOption, filter.value]);

  const onOptionUpdated = useCallback(
    (option: FilterSelectOptionType) => {
      updateFilter({ ...filter, value: option.value });
    },
    [updateFilter, filter],
  );

  const valueIsEmpty = !filter.value;

  useEffect(() => {
    if (valueIsEmpty && selectedSelectFilterOption) {
      onOptionUpdated(selectedSelectFilterOption);
    }
  }, [valueIsEmpty, onOptionUpdated, selectedSelectFilterOption]);

  if (!filterOption?.options || !selectedSelectFilterOption) {
    return null;
  }

  return (
    <HStack>
      <SelectFieldDropdown filterOptions={filterOptions} filter={filter} />
      <SelectComparatorDropdown filter={filter} filterType="select" />
      <InputDropdown
        options={filterOption.options}
        getDisplayLabel={(option) => option.label}
        selectedOption={selectedSelectFilterOption}
        onSelect={onOptionUpdated}
      />
      <IconButton
        aria-label="Remove Filter"
        icon={<BsTrash />}
        onClick={() => removeFilter(filter)}
      />
    </HStack>
  );
};

export default SelectFilter;
