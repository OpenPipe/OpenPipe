import { type AtLeastOne } from "~/types/shared.types";

import DateFilter from "./DateFilter";
import SelectFilter from "./SelectFilter";
import TextFilter from "./TextFilter";
import { type FilterData, type FilterOption } from "../types";

const Filter = ({
  filterOptions,
  filter,
}: {
  filterOptions: AtLeastOne<FilterOption>;
  filter: FilterData;
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
