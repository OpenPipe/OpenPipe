import { resetLogSelection } from "./selectedLogsSlice";
import { type SliceCreator } from "./store";

export const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

export const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"] as const;

export interface LogFilter {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string;
}

export type LogFiltersSlice = {
  filters: LogFilter[];
  addFilter: (filter: LogFilter) => void;
  updateFilter: (filter: LogFilter) => void;
  deleteFilter: (id: string) => void;
  clearFilters: () => void;
};

export const createLogFiltersSlice: SliceCreator<LogFiltersSlice> = (set, get) => ({
  filters: [],
  addFilter: (filter: LogFilter) =>
    set((state) => {
      state.logFilters.filters.push(filter);
      resetLogSelection(state);
    }),
  updateFilter: (filter: LogFilter) =>
    set((state) => {
      const index = state.logFilters.filters.findIndex((f) => f.id === filter.id);
      state.logFilters.filters[index] = filter;
      resetLogSelection(state);
    }),
  deleteFilter: (id: string) =>
    set((state) => {
      const index = state.logFilters.filters.findIndex((f) => f.id === id);
      state.logFilters.filters.splice(index, 1);
      resetLogSelection(state);
    }),
  clearFilters: () =>
    set((state) => {
      state.logFilters.filters = [];
      resetLogSelection(state);
    }),
});
