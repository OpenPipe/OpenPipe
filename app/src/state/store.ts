import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { createSelectors } from "./createSelectors";
import {
  type SharedVariantEditorSlice,
  createVariantEditorSlice,
} from "./sharedVariantEditor.slice";
import { type APIClient } from "~/utils/api";
import { persistOptions, type stateToPersist } from "./persist";
import { type SelectedLogsSlice, createSelectedLogsSlice } from "./selectedLogsSlice";

export type State = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  sharedVariantEditor: SharedVariantEditorSlice;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  selectedLogs: SelectedLogsSlice;
};

export type SliceCreator<T> = StateCreator<State, [["zustand/immer", never]], [], T>;

export type SetFn = Parameters<SliceCreator<unknown>>[0];
export type GetFn = Parameters<SliceCreator<unknown>>[1];

const useBaseStore = create<
  State,
  [["zustand/persist", typeof stateToPersist], ["zustand/immer", never]]
>(
  persist(
    immer((set, get, ...rest) => ({
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
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
