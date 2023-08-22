import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { persist } from "zustand/middleware";
import { createSelectors } from "./createSelectors";
import {
  type SharedVariantEditorSlice,
  createVariantEditorSlice,
} from "./sharedVariantEditor.slice";
import { type APIClient } from "~/utils/api";
import { type PersistedState, persistOptions } from "./persist";
import { type SelectedLogsSlice, createSelectedLogsSlice } from "./selectedLogsSlice";
import { type LogFiltersSlice, createLogFiltersSlice } from "./logFiltersSlice";
import { createColumnVisibilitySlice, type ColumnVisibilitySlice } from "./columnVisiblitySlice";

enableMapSet();

export type State = {
  isRehydrated: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  sharedVariantEditor: SharedVariantEditorSlice;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  selectedLogs: SelectedLogsSlice;
  logFilters: LogFiltersSlice;
  columnVisibility: ColumnVisibilitySlice;
};

export type SliceCreator<T> = StateCreator<State, [["zustand/immer", never]], [], T>;

export type SetFn = Parameters<SliceCreator<unknown>>[0];
export type GetFn = Parameters<SliceCreator<unknown>>[1];

const useBaseStore = create<State, [["zustand/persist", PersistedState], ["zustand/immer", never]]>(
  persist(
    immer((set, get, ...rest) => ({
      isRehydrated: false,
      api: null,
      setApi: (api) =>
        set((state) => {
          state.api = api;
        }),
      drawerOpen: false,
      openDrawer: () =>
        set((state) => {
          state.drawerOpen = true;
        }),
      closeDrawer: () =>
        set((state) => {
          state.drawerOpen = false;
        }),
      sharedVariantEditor: createVariantEditorSlice(set, get, ...rest),
      selectedProjectId: null,
      setSelectedProjectId: (id: string) =>
        set((state) => {
          state.selectedProjectId = id;
        }),
      selectedLogs: createSelectedLogsSlice(set, get, ...rest),
      logFilters: createLogFiltersSlice(set, get, ...rest),
      columnVisibility: createColumnVisibilitySlice(set, get, ...rest),
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
