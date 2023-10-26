import Filters from "../Filters/Filters";
import { useTagNames } from "~/utils/hooks";

export const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"] as const;

const LogFilters = () => {
  const tagNames = useTagNames().data;

  if (!tagNames) return null;

  return <Filters filterOptions={[...defaultFilterableFields, ...tagNames]} />;
};

export default LogFilters;
