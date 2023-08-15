import { type SliceCreator } from "./store";

export const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

export const defaultFilterableFields = ["Request", "Response", "Model", "Status Code"] as const;

export interface LogFilter {
  field: string;
  comparator: (typeof comparators)[number];
  value?: string;
}

export type LogFiltersSlice = {
  filters: LogFilter[];
  addFilter: (filter: LogFilter) => void;
  updateFilter: (index: number, filter: LogFilter) => void;
  deleteFilter: (index: number) => void;
  clearSelectedLogIds: () => void;
};

export const createLogFiltersSlice: SliceCreator<LogFiltersSlice> = (set, get) => ({
  filters: [],
  addFilter: (filter: LogFilter) =>
    set((state) => {
      state.logFilters.filters.push(filter);
    }),
  updateFilter: (index: number, filter: LogFilter) =>
    set((state) => {
      state.logFilters.filters[index] = filter;
    }),
  deleteFilter: (index: number) =>
    set((state) => {
      state.logFilters.filters.splice(index, 1);
    }),
  clearSelectedLogIds: () =>
    set((state) => {
      state.logFilters.filters = [];
    }),
});
