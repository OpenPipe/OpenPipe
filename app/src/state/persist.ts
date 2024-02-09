import { type PersistOptions } from "zustand/middleware/persist";
import { type State } from "./store";
import SuperJSON from "superjson";
import { merge, pick } from "lodash-es";
import { type PartialDeep } from "type-fest";

export type PersistedState = PartialDeep<State>;

export const persistOptions: PersistOptions<State, PersistedState> = {
  name: "persisted-app-store",
  partialize: (state) => ({
    columnVisibility: pick(state.columnVisibility, ["visibleColumns"]),
  }),
  merge: (saved, state) => merge(state, saved),
  storage: {
    getItem: (key) => {
      const data = localStorage.getItem(key);
      return data ? SuperJSON.parse(data) : null;
    },
    setItem: (key, value) => localStorage.setItem(key, SuperJSON.stringify(value)),
    removeItem: (key) => localStorage.removeItem(key),
  },
  onRehydrateStorage: (state) => {
    if (state) state.isRehydrated = true;
  },
};
