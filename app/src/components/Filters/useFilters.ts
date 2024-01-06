import { useQueryParam, JsonParam, withDefault, encodeQueryParams } from "use-query-params";

import { type FilterData } from "./types";

export const useFilters = (defaultShown?: boolean) => {
  const [filterData, setFilterData] = useQueryParam<{ shown: boolean; filters: FilterData[] }>(
    "filterData",
    withDefault(JsonParam, { shown: !!defaultShown, filters: [] }),
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

  return {
    filters: filterData.filters,
    filtersShown: filterData.shown,
    addFilter,
    updateFilter,
    removeFilter,
    setFiltersShown,
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
