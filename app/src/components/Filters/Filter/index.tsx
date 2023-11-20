import { type AtLeastOne } from "~/types/shared.types";
import { type FilterDataType, type FilterOptionType } from "../types";
import DateFilter from "./DateFilter";
import TextFilter from "./TextFilter";
import SelectFilter from "./SelectFilter";

const Filter = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOptionType>;
  filter: FilterDataType;
}) => {
  const selectedFilterOption = filterOptions.find(
    (filterOption) => filterOption.field === filter.field,
  );

  if (selectedFilterOption?.type === "select") {
    return <SelectFilter filterOptions={filterOptions} filter={filter} />;
  }

  if (selectedFilterOption?.type === "date") {
    return <DateFilter filterOptions={filterOptions} filter={filter} />;
  }

  return <TextFilter filterOptions={filterOptions} filter={filter} />;
};

export default Filter;
