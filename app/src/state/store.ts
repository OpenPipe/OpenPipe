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
import {
  type SelectedDatasetEntriesSlice,
  createSelectedDatasetEntriesSlice,
} from "./selectedDatasetEntriesSlice";
import { type ColumnVisibilitySlice, createColumnVisibilitySlice } from "./columnVisibilitySlice";
import { type FeatureFlagsSlice, createFeatureFlagsSlice } from "./featureFlags";
import { type EvaluationsSlice, createEvaluationsSlice } from "./evaluationsSlice";

enableMapSet();

export type State = {
  isRehydrated: boolean;
  isMounted: boolean;
  markMounted: () => void;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  betaBannerDismissed: boolean;
  dismissBetaBanner: () => void;
  sharedArgumentsEditor: SharedArgumentsEditorSlice;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  selectedLogs: SelectedLogsSlice;
  selectedDatasetEntries: SelectedDatasetEntriesSlice;
  columnVisibility: ColumnVisibilitySlice;
  featureFlags: FeatureFlagsSlice;
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
      api: null,
      setApi: (api) =>
        set((state) => {
          state.api = api;
        }),
      betaBannerDismissed: false,
      dismissBetaBanner: () =>
        set((state) => {
          state.betaBannerDismissed = true;
        }),
      sharedArgumentsEditor: createArgumentsEditorSlice(set, get, ...rest),
      selectedProjectId: null,
      setSelectedProjectId: (id: string) =>
        set((state) => {
          state.selectedProjectId = id;
        }),
      selectedLogs: createSelectedLogsSlice(set, get, ...rest),
      selectedDatasetEntries: createSelectedDatasetEntriesSlice(set, get, ...rest),
      columnVisibility: createColumnVisibilitySlice(set, get, ...rest),
      featureFlags: createFeatureFlagsSlice(set, get, ...rest),
      evaluationsSlice: createEvaluationsSlice(set, get, ...rest),
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
