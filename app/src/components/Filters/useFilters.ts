import { useQueryParam, JsonParam, withDefault, encodeQueryParams } from "use-query-params";

import { type FilterData } from "./types";

export const useFilters = (options?: { defaultShown?: boolean; urlKey?: string }) => {
  const [filterData, setFilterData] = useQueryParam<{ shown: boolean; filters: FilterData[] }>(
    options?.urlKey ?? "filterData",
    withDefault(JsonParam, { shown: !!options?.defaultShown, filters: [] }),
  );

  const setFiltersShown = (shown: boolean) => setFilterData({ ...filterData, shown });

  const addFilter = (filter: FilterData) => {
    setFilterData({ shown: true, filters: [...filterData.filters, filter] });
  };
  const updateFilter = (filter: FilterData) =>
    setFilterData({
      shown: true,
      filters: filterData.filters.map((f) => (f.id === filter.id ? filter : f)),
    });

  const removeFilter = (filter: FilterData) =>
    setFilterData({ ...filterData, filters: filterData.filters.filter((f) => f.id !== filter.id) });

  const setFilters = (filters: FilterData[]) => setFilterData({ shown: true, filters });

  return {
    filters: filterData.filters,
    filtersShown: filterData.shown,
    addFilter,
    updateFilter,
    removeFilter,
    setFiltersShown,
    setFilters,
  };
};

export const constructFiltersQueryParams = (filters: FilterData[]): Record<string, any> => {
  const queryParams = {
    filterData: {
      shown: true,
      filters,
    },
  };

  const encodedParams = encodeQueryParams({ filterData: JsonParam }, queryParams);

  return Object.fromEntries(
    Object.entries(encodedParams).map(([key, value]) => [key, value?.toString()]),
  );
};
