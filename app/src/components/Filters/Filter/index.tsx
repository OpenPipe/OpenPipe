import { type AtLeastOne } from "~/types/shared.types";
import { type FilterData, type FilterOption } from "../types";
import TextFilter from "./TextFilter";
import SelectFilter from "./SelectFilter";

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

  return <TextFilter filterOptions={filterOptions} filter={filter} />;
};

export default Filter;
