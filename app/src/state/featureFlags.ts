import { type SliceCreator } from "./store";

export type FeatureFlagsSlice = {
  flagsLoaded: boolean;
  featureFlags: {
    betaAccess: boolean;
  };
  setFeatureFlags: (flags: string[] | undefined) => void;
};

export const createFeatureFlagsSlice: SliceCreator<FeatureFlagsSlice> = (set) => ({
  flagsLoaded: false,
  featureFlags: {
    betaAccess: false,
  },
  setFeatureFlags: (flags) =>
    set((state) => {
      state.featureFlags.featureFlags = {
        betaAccess: flags?.includes("betaAccess") ?? false,
      };
      state.featureFlags.flagsLoaded = true;
    }),
});
