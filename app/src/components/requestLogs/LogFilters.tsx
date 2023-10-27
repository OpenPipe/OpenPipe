import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import Filters from "../Filters/Filters";
import { useTagNames } from "~/utils/hooks";

const defaultFilterableFields = [
  LoggedCallsFiltersDefaultFields.Request,
  LoggedCallsFiltersDefaultFields.Response,
  LoggedCallsFiltersDefaultFields.Model,
  LoggedCallsFiltersDefaultFields.StatusCode,
];

const LogFilters = () => {
  const tagNames = useTagNames().data;

  if (!tagNames) return null;

  return <Filters filterOptions={[...defaultFilterableFields, ...tagNames]} />;
};

export default LogFilters;
