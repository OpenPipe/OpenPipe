import { useMemo } from "react";

import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import Filters from "../Filters/Filters";
import { useTagNames } from "~/utils/hooks";
import { type FilterOption } from "../Filters/types";

const defaultFilterOptions: FilterOption[] = [
  { type: "text", field: LoggedCallsFiltersDefaultFields.Request, label: "Request" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Response, label: "Response" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Model, label: "Model" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.StatusCode, label: "Status Code" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.CompletionId, label: "Completion Id" },
];

const LogFilters = () => {
  const tagNames = useTagNames().data;

  const filterOptions = useMemo(() => {
    const tagFilters: FilterOption[] = (tagNames || []).map((tag) => ({
      type: "text",
      field: `tags.${tag}`,
      label: tag,
    }));
    return [...defaultFilterOptions, ...tagFilters];
  }, [tagNames]);

  return <Filters filterOptions={filterOptions} />;
};

export default LogFilters;
