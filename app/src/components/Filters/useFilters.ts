import {
  useQueryParam,
  JsonParam,
  BooleanParam,
  withDefault,
  encodeQueryParams,
} from "use-query-params";

import { type FilterDataType } from "./types";

export const useFilters = () => {
  const [filters, setFilters] = useQueryParam<FilterDataType[]>(
    "filters",
    withDefault(JsonParam, []),
  );
  const [filtersShown, setFiltersShown] = useQueryParam<boolean>(
    "filtersShown",
    withDefault(BooleanParam, false),
  );

  const addFilter = (filter: FilterDataType) => {
    setFilters([...filters, filter]);
    setFiltersShown(true);
  };
  const updateFilter = (filter: FilterDataType) =>
    setFilters(filters.map((f) => (f.id === filter.id ? filter : f)));

  const removeFilter = (filter: FilterDataType) =>
    setFilters(filters.filter((f) => f.id !== filter.id));

  return {
    filters,
    setFilters,
    addFilter,
    updateFilter,
    removeFilter,
    filtersShown,
    setFiltersShown,
  };
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
