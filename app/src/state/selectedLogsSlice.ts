import { type SliceCreator } from "./store";

export type SelectedLogsSlice = {
  selectedLogIds: Set<string>;
  toggleSelectedLogId: (id: string) => void;
  addSelectedLogIds: (ids: string[]) => void;
  clearSelectedLogIds: () => void;
};

export const createSelectedLogsSlice: SliceCreator<SelectedLogsSlice> = (set, get) => ({
  selectedLogIds: new Set(),
  toggleSelectedLogId: (id: string) =>
    set((state) => {
      if (state.selectedLogs.selectedLogIds.has(id)) {
        state.selectedLogs.selectedLogIds.delete(id);
      } else {
        state.selectedLogs.selectedLogIds.add(id);
      }
    }),
  addSelectedLogIds: (ids: string[]) =>
    set((state) => {
      state.selectedLogs.selectedLogIds = new Set([...state.selectedLogs.selectedLogIds, ...ids]);
    }),
  clearSelectedLogIds: () =>
    set((state) => {
      state.selectedLogs.selectedLogIds = new Set();
    }),
});
