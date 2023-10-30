import { useQueryParam, JsonParam, withDefault } from "use-query-params";
import { type FilterDataType } from "./types";

export const useFilters = () => {
  const [filters, setFilters] = useQueryParam<FilterDataType[]>(
    "filters",
    withDefault(JsonParam, []),
  );

  const addFilter = (filter: FilterDataType) => setFilters([...filters, filter]);
  const updateFilter = (filter: FilterDataType) =>
    setFilters(filters.map((f) => (f.id === filter.id ? filter : f)));

  const removeFilter = (filter: FilterDataType) =>
    setFilters(filters.filter((f) => f.id !== filter.id));

  return { filters, setFilters, addFilter, updateFilter, removeFilter };
};
