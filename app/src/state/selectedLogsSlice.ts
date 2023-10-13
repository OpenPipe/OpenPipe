import { type State, type SliceCreator } from "./store";

export type SelectedLogsSlice = {
  matchingLogsCount: number;
  setMatchingLogsCount: (count: number) => void;
  defaultToSelected: boolean;
  selectedLogIds: Set<string>;
  deselectedLogIds: Set<string>;
  toggleSelectedLogId: (id: string) => void;
  toggleAllSelected: () => void;
  resetLogSelection: () => void;
};

export const createSelectedLogsSlice: SliceCreator<SelectedLogsSlice> = (set) => ({
  matchingLogsCount: 0,
  setMatchingLogsCount: (count: number) =>
    set((state) => {
      state.selectedLogs.matchingLogsCount = count;
    }),
  defaultToSelected: false,
  selectedLogIds: new Set(),
  deselectedLogIds: new Set(),
  toggleSelectedLogId: (id: string) =>
    set((state) => {
      if (state.selectedLogs.defaultToSelected) {
        if (state.selectedLogs.deselectedLogIds.has(id)) {
          state.selectedLogs.deselectedLogIds.delete(id);
        } else {
          state.selectedLogs.deselectedLogIds.add(id);
        }
      } else {
        if (state.selectedLogs.selectedLogIds.has(id)) {
          state.selectedLogs.selectedLogIds.delete(id);
        } else {
          state.selectedLogs.selectedLogIds.add(id);
        }
      }
      // Handle the case where all logs are selected or deselected one-by-one
      if (state.selectedLogs.selectedLogIds.size === state.selectedLogs.matchingLogsCount) {
        state.selectedLogs.defaultToSelected = true;
        state.selectedLogs.selectedLogIds = new Set();
      } else if (
        state.selectedLogs.deselectedLogIds.size === state.selectedLogs.matchingLogsCount
      ) {
        state.selectedLogs.defaultToSelected = false;
        state.selectedLogs.deselectedLogIds = new Set();
      }
    }),
  toggleAllSelected: () =>
    set((state) => {
      if (state.selectedLogs.defaultToSelected) {
        if (state.selectedLogs.deselectedLogIds.size) {
          state.selectedLogs.deselectedLogIds = new Set();
        } else {
          state.selectedLogs.defaultToSelected = false;
        }
      } else {
        state.selectedLogs.defaultToSelected = true;
        if (state.selectedLogs.selectedLogIds.size) state.selectedLogs.selectedLogIds = new Set();
      }
    }),
  resetLogSelection: () => set(resetLogSelection),
});

export const resetLogSelection = (state: State) => {
  state.selectedLogs.defaultToSelected = false;
  state.selectedLogs.selectedLogIds = new Set();
  state.selectedLogs.deselectedLogIds = new Set();
};
