import { useMemo } from "react";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import Filters from "../Filters/Filters";
import { useTagNames } from "~/utils/hooks";

const defaultFilterableFields = [
  { field: LoggedCallsFiltersDefaultFields.Request },
  { field: LoggedCallsFiltersDefaultFields.Response },
  { field: LoggedCallsFiltersDefaultFields.Model },
  { field: LoggedCallsFiltersDefaultFields.StatusCode },
  { field: LoggedCallsFiltersDefaultFields.SentAt, type: "date" },
];

const LogFilters = () => {
  const tagNames = useTagNames().data;

  const filterOptions = useMemo(
    () => [...defaultFilterableFields, ...(tagNames || []).map((tag) => ({ field: tag }))],
    [tagNames],
  );

  return <Filters filterOptions={filterOptions} />;
};

export default LogFilters;
