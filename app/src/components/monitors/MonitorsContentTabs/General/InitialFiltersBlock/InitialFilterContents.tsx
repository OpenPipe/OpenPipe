import { useMemo } from "react";

import { useSelectedProject } from "~/utils/hooks";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import { type FilterOption } from "~/components/Filters/types";
import { FilterContents } from "~/components/Filters/Filters";

import { useInitialFilters } from "./useInitialFilters";
import { INITIAL_FILTERS_URL_KEY } from "../constants";

export const defaultMonitorSQLFilterOptions: FilterOption[] = [
  { type: "text", field: LoggedCallsFiltersDefaultFields.Request, label: "Request" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.Response, label: "Response" },
  { type: "text", field: LoggedCallsFiltersDefaultFields.CompletionId, label: "Completion Id" },
  { type: "date", field: LoggedCallsFiltersDefaultFields.SentAt, label: "Sent At" },
];

const InitialFilterContents = () => {
  const tagNames = useSelectedProject().data?.tagNames;

  const { strippedFilters } = useInitialFilters();

  const filterOptions = useMemo(() => {
    const tagFilterOptions: FilterOption[] = (tagNames || []).map((tag) => ({
      type: "text",
      field: `tags.${tag}`,
      label: tag,
    }));
    return [...defaultMonitorSQLFilterOptions, ...tagFilterOptions];
  }, [tagNames]);

  if (!strippedFilters) return null;

  return (
    <FilterContents
      filters={strippedFilters}
      filterOptions={filterOptions}
      urlKey={INITIAL_FILTERS_URL_KEY}
    />
  );
};

export default InitialFilterContents;
