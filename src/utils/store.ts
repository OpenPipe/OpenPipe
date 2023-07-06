import { create } from "zustand";

type StoreState = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useStore = create<StoreState>()((set) => ({
  drawerOpen: true,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
