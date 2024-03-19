import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { persist } from "zustand/middleware";
import { createSelectors } from "./createSelectors";
import {
  type SharedArgumentsEditorSlice,
  createArgumentsEditorSlice,
} from "./sharedArgumentsEditor.slice";
import { type APIClient } from "~/utils/api";
import { type PersistedState, persistOptions } from "./persist";
import { type SelectedLogsSlice, createSelectedLogsSlice } from "./selectedLogsSlice";
import { type ColumnVisibilitySlice, createColumnVisibilitySlice } from "./columnVisibilitySlice";
import { type EvaluationsSlice, createEvaluationsSlice } from "./evaluationsSlice";

enableMapSet();

export type State = {
  isRehydrated: boolean;
  isMounted: boolean;
  markMounted: () => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  sharedArgumentsEditor: SharedArgumentsEditorSlice;
  selectedLogs: SelectedLogsSlice;
  columnVisibility: ColumnVisibilitySlice;
  evaluationsSlice: EvaluationsSlice;
};

export type SliceCreator<T> = StateCreator<State, [["zustand/immer", never]], [], T>;

export type SetFn = Parameters<SliceCreator<unknown>>[0];
export type GetFn = Parameters<SliceCreator<unknown>>[1];

const useBaseStore = create<State, [["zustand/persist", PersistedState], ["zustand/immer", never]]>(
  persist(
    immer((set, get, ...rest) => ({
      isRehydrated: false,
      isMounted: false,
      markMounted: () =>
        set((state) => {
          state.isMounted = true;
        }),
      sidebarExpanded: true,
      setSidebarExpanded: (expanded) =>
        set((state) => {
          state.sidebarExpanded = expanded;
        }),
      api: null,
      setApi: (api) =>
        set((state) => {
          state.api = api;
        }),
      sharedArgumentsEditor: createArgumentsEditorSlice(set, get, ...rest),
      selectedLogs: createSelectedLogsSlice(set, get, ...rest),
      columnVisibility: createColumnVisibilitySlice(set, get, ...rest),
      evaluationsSlice: createEvaluationsSlice(set, get, ...rest),
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
