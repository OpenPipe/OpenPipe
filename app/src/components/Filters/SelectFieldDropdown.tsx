import InputDropdown from "~/components/InputDropdown";
import { type FilterType, useFilters } from "./useFilters";

const SelectFieldDropdown = ({
  filterOptions,
  filter,
}: {
  filterOptions: string[];
  filter: FilterType;
}) => {
  const updateFilter = useFilters().updateFilter;

  const { field } = filter;

  return (
    <InputDropdown
      options={filterOptions}
      selectedOption={field}
      onSelect={(option) => updateFilter({ ...filter, field: option })}
    />
  );
};

export default SelectFieldDropdown;
