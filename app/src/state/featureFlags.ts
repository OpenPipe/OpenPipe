import { type SliceCreator } from "./store";

export type FeatureFlagsSlice = {
  featureFlags: {
    betaAccess: boolean;
  };
  setFeatureFlags: (flags: string[] | undefined) => void;
};

export const createFeatureFlagsSlice: SliceCreator<FeatureFlagsSlice> = (set) => ({
  featureFlags: {
    betaAccess: false,
  },
  setFeatureFlags: (flags) =>
    set((state) => {
      state.featureFlags.featureFlags = {
        betaAccess: flags?.includes("betaAccess") ?? false,
      };
    }),
});
