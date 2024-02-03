import { useQueryParam, JsonParam, withDefault, encodeQueryParams } from "use-query-params";

import { type FilterData } from "./types";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";

// const defaultOneDayFilter: FilterData = {
//   id: "1",
//   field: LoggedCallsFiltersDefaultFields.SentAt,
//   comparator: "LAST 24H",
//   value: [Date.now(), Date.now()],
// };

export const useDateFilter = () => {
  const [dateFilterData, setDateFilterData] = useQueryParam<FilterData | null>(
    "dateFilterData",
    withDefault(JsonParam, getDefaultDateFilter("LAST 24H")),
  );
  console.log(dateFilterData);
  const updateFilter = (filter: FilterData) => setDateFilterData(filter);
  const deleteFilter = () => setDateFilterData(null);
  const addFilter = (comparator: FilterData["comparator"]) => {
    setDateFilterData(getDefaultDateFilter(comparator));
  };

  return {
    filter: dateFilterData,
    updateFilter,
    addFilter,
    deleteFilter,
  };
};

const getDefaultDateFilter = (comparator: FilterData["comparator"]): FilterData => {
  return {
    id: Date.now().toString(),
    field: LoggedCallsFiltersDefaultFields.SentAt,
    comparator,
    value: [Date.now(), Date.now()],
  };
};
