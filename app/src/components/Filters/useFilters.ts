import { useQueryParam, JsonParam, withDefault, encodeQueryParams } from "use-query-params";

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

export const constructFiltersQueryParams = (filters: FilterDataType[]): Record<string, any> => {
  const queryParams = {
    filters,
  };

  const encodedParams = encodeQueryParams({ filters: JsonParam }, queryParams);

  return Object.fromEntries(
    Object.entries(encodedParams).map(([key, value]) => [key, value?.toString()]),
  );
};
