import { type SliceCreator } from "./store";

export type SelectedDatasetEntriesSlice = {
  selectedIds: Set<string>;
  toggleSelectedId: (id: string) => void;
  addSelectedIds: (ids: string[]) => void;
  clearSelectedIds: () => void;
};

export const createSelectedDatasetEntriesSlice: SliceCreator<SelectedDatasetEntriesSlice> = (
  set,
) => ({
  selectedIds: new Set(),
  toggleSelectedId: (id: string) =>
    set((state) => {
      if (state.selectedDatasetEntries.selectedIds.has(id)) {
        state.selectedDatasetEntries.selectedIds.delete(id);
      } else {
        state.selectedDatasetEntries.selectedIds.add(id);
      }
    }),
  addSelectedIds: (ids: string[]) =>
    set((state) => {
      state.selectedDatasetEntries.selectedIds = new Set([
        ...state.selectedDatasetEntries.selectedIds,
        ...ids,
      ]);
    }),
  clearSelectedIds: () =>
    set((state) => {
      state.selectedDatasetEntries.selectedIds = new Set();
    }),
});
