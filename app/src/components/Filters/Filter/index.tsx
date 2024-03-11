import { type AtLeastOne } from "~/types/shared.types";
import { type FilterData, type FilterOption } from "../types";
import DateFilter from "./DateFilter";
import TextFilter from "./TextFilter";
import SelectFilter from "./SelectFilter";

const Filter = ({
  filterOptions,
  filter,
  urlKey,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
  urlKey?: string;
}) => {
  const selectedFilterOption = filterOptions.find(
    (filterOption) => filterOption.field === filter.field,
  );

  if (selectedFilterOption?.type === "select") {
    return <SelectFilter urlKey={urlKey} filterOptions={filterOptions} filter={filter} />;
  }

  if (selectedFilterOption?.type === "date") {
    return <DateFilter urlKey={urlKey} filterOptions={filterOptions} filter={filter} />;
  }

  return <TextFilter urlKey={urlKey} filterOptions={filterOptions} filter={filter} />;
};

export default Filter;
