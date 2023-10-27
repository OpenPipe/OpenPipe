import { useQueryParam, JsonParam, withDefault } from "use-query-params";
import { type comparators } from "~/types/shared.types";

export interface FilterType {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string;
}

export const useFilters = () => {
  const [filters, setFilters] = useQueryParam<FilterType[]>("filters", withDefault(JsonParam, []));

  const addFilter = (filter: FilterType) => setFilters([...filters, filter]);
  const updateFilter = (filter: FilterType) =>
    setFilters(filters.map((f) => (f.id === filter.id ? filter : f)));

  const removeFilter = (filter: FilterType) =>
    setFilters(filters.filter((f) => f.id !== filter.id));

  return { filters, setFilters, addFilter, updateFilter, removeFilter };
};
