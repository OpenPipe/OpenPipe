import { FiFilter } from "react-icons/fi";

import ActionButton from "./ActionButton";
import { useFilters } from "~/components/Filters/useFilters";

const ToggleFiltersButton = ({ defaultShown }: { defaultShown?: boolean }) => {
  const filters = useFilters().filters;
  const filtersShown = useFilters({ defaultShown }).filtersShown;
  const setFiltersShown = useFilters().setFiltersShown;

  return (
    <ActionButton
      onClick={() => {
        setFiltersShown(!filtersShown);
      }}
      label={
        filtersShown
          ? "Hide Filters"
          : "Show Filters" + (filters.length ? " (" + filters.length.toString() + ")" : "")
      }
      icon={FiFilter}
    />
  );
};

export default ToggleFiltersButton;
