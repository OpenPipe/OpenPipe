import { type SliceCreator } from "./store";

export const editorBackground = "#fafafa";

export type SelectedLogsSlice = {
  selectedLogIds: Set<string>;
  setSelectedLogIds: (ids: Set<string>) => void;
  toggleSelectedLogId: (id: string) => void;
};

export const createSelectedLogsSlice: SliceCreator<SelectedLogsSlice> = (set, get) => ({
  selectedLogIds: new Set(),
  setSelectedLogIds: (ids: Set<string>) =>
    set((state) => {
      state.selectedLogs.selectedLogIds = ids;
    }),
  toggleSelectedLogId: (id: string) =>
    set((state) => {
      if (state.selectedLogs.selectedLogIds.has(id)) {
        state.selectedLogs.selectedLogIds.delete(id);
      } else {
        state.selectedLogs.selectedLogIds.add(id);
      }
    }),
});
