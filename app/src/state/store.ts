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

export type State = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  api: APIClient | null;
  setApi: (api: APIClient) => void;
  sharedVariantEditor: SharedVariantEditorSlice;
  selectedProjectId: string | null;
  setselectedProjectId: (id: string) => void;
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
      setselectedProjectId: (id: string) =>
        set((state) => {
          state.selectedProjectId = id;
        }),
    })),
    persistOptions,
  ),
);

export const useAppStore = createSelectors(useBaseStore);
