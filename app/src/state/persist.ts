import { type PersistOptions } from "zustand/middleware/persist";
import { type State } from "./store";

export const stateToPersist = {
  selectedProjectId: null as string | null,
};

export const persistOptions: PersistOptions<State, typeof stateToPersist> = {
  name: "persisted-app-store",
  partialize: (state) => ({
    selectedProjectId: state.selectedProjectId,
  }),
};
