import { type PersistOptions } from "zustand/middleware/persist";
import { type State } from "./store";
import SuperJSON from "superjson";

export const stateToPersist = {
  selectedProjectId: null as string | null,
  columnVisibility: {
    hiddenColumns: new Set<string>(),
  },
};

export const persistOptions: PersistOptions<State, typeof stateToPersist> = {
  name: "persisted-app-store",
  partialize: (state) => ({
    selectedProjectId: state.selectedProjectId,
    columnVisibility: {
      hiddenColumns: state.columnVisibility.hiddenColumns,
    },
  }),
  storage: {
    getItem: (key) => {
      const data = localStorage.getItem(key);
      return data ? SuperJSON.parse(data) : null;
    },
    setItem: (key, value) => localStorage.setItem(key, SuperJSON.stringify(value)),
    removeItem: (key) => localStorage.removeItem(key),
  },
};
