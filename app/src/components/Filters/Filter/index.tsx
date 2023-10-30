import { type FilterDataType, type FilterOptionType } from "../types";
import DateFilter from "./DateFilter";
import TextFilter from "./TextFilter";

const Filter = ({
  filterOptions,
  filter,
}: {
  filterOptions: FilterOptionType[];
  filter: FilterDataType;
}) => {
  const selectedFilterOption = filterOptions.find(
    (filterOption) => filterOption.field === filter.field,
  );

  if (selectedFilterOption?.type === "date") {
    return <DateFilter filterOptions={filterOptions} filter={filter} />;
  }

  return <TextFilter filterOptions={filterOptions} filter={filter} />;
};

export default Filter;
