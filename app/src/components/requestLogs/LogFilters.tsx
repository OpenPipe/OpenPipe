import { useAppStore } from "~/state/store";
import Filters from "../Filters/Filters";

export const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"] as const;

const LogFilters = () => {
  const filters = useAppStore((s) => s.logFilters.filters);
  return <Filters filters={filters} />;
};

export default LogFilters;
