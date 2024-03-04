import type { DatasetEvalType } from "@prisma/client";

import { type SliceCreator } from "./store";

type ComparisonCriteria = {
  type: DatasetEvalType;
  modelId: string;
  nodeEntryId: string;
  datasetEvalId: string;
};

export type EvaluationsSlice = {
  comparisonCriteria: ComparisonCriteria | null;
  setComparisonCriteria: (criteria: ComparisonCriteria | null) => void;
  resetEvaluationsSlice: () => void;
};

export const createEvaluationsSlice: SliceCreator<EvaluationsSlice> = (set) => ({
  comparisonCriteria: null,
  setComparisonCriteria: (criteria) =>
    set((state) => {
      state.evaluationsSlice.comparisonCriteria = criteria;
    }),
  resetEvaluationsSlice: () =>
    set((state) => {
      state.evaluationsSlice.comparisonCriteria = null;
    }),
});
