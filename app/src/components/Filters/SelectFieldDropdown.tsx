import InputDropdown from "~/components/InputDropdown";
import { type FilterData, useFilters } from "./useFilters";

const SelectFieldDropdown = ({
  filterOptions,
  filter,
}: {
  filterOptions: string[];
  filter: FilterData;
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
