import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { persist } from "zustand/middleware";
import { createSelectors } from "./createSelectors";
import {
  type SharedVariantEditorSlice,
  createVariantEditorSlice,
} from "./sharedVariantEditor.slice";
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

enableMapSet();

export type State = {
  isRehydrated: boolean;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  betaBannerDismissed: boolean;
  dismissBetaBanner: () => void;
  sharedVariantEditor: SharedVariantEditorSlice;
  sharedArgumentsEditor: SharedArgumentsEditorSlice;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  selectedLogs: SelectedLogsSlice;
  selectedDatasetEntries: SelectedDatasetEntriesSlice;
  columnVisibility: ColumnVisibilitySlice;
  featureFlags: FeatureFlagsSlice;
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
      betaBannerDismissed: false,
      dismissBetaBanner: () =>
        set((state) => {
          state.betaBannerDismissed = true;
        }),
      sharedVariantEditor: createVariantEditorSlice(set, get, ...rest),
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
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
