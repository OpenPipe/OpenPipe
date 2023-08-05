import { type StoreApi, type UseBoundStore } from "zustand";

type NestedSelectors<T> = {
  [K in keyof T]: T[K] extends object
    ? { [NestedK in keyof T[K]]: () => T[K][NestedK] }
    : () => T[K];
};

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: NestedSelectors<T> }
  : never;

// Adapted from https://docs.pmnd.rs/zustand/guides/auto-generating-selectors

/* eslint-disable */

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    // @ts-expect-error black magic
    const stateValue = store.getState()[k];
    if (typeof stateValue === "object" && stateValue !== null) {
      (store.use as any)[k] = {};
      for (const nestedK of Object.keys(stateValue)) {
        // @ts-expect-error black magic
        (store.use as any)[k][nestedK] = () => store((s) => s[k][nestedK as keyof (typeof s)[k]]);
      }
    } else {
      (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
    }
  }

  return store;
};
