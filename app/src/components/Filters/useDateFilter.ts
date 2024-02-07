import { useQueryParam, JsonParam, withDefault } from "use-query-params";

import { type FilterData } from "./types";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";

export const useDateFilter = () => {
  const [dateFilter, setDateFilter] = useQueryParam<FilterData[]>(
    "dateFilter",
    withDefault(JsonParam, []),
  );
  const updateFilter = (filter: FilterData) => setDateFilter([filter]);
  const deleteFilter = () => setDateFilter([]);
  const addFilter = (comparator: FilterData["comparator"]) => {
    setDateFilter([getDefaultDateFilter(comparator)]);
  };

  return {
    filters: dateFilter,
    updateFilter,
    addFilter,
    deleteFilter,
  };
};

export function getDefaultDateFilter(comparator: FilterData["comparator"]): FilterData {
  return {
    id: Date.now().toString(),
    field: LoggedCallsFiltersDefaultFields.SentAt,
    comparator,
    value: [Date.now(), Date.now()],
  };
}
