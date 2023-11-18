import { type SliceCreator } from "./store";

type ComparisonCriteria = {
  modelId: string;
  datasetEntryId: string;
  datasetEvalId: string;
};

export type EvaluationsSlice = {
  comparisonCriteria: ComparisonCriteria | null;
  setComparisonCriteria: (criteria: ComparisonCriteria | null) => void;
  datasetEvalIdToEdit: string | null;
  setDatasetEvalIdToEdit: (id: string | null) => void;
  resetEvaluationsSlice: () => void;
};

export const createEvaluationsSlice: SliceCreator<EvaluationsSlice> = (set) => ({
  comparisonCriteria: null,
  setComparisonCriteria: (criteria) =>
    set((state) => {
      state.evaluationsSlice.comparisonCriteria = criteria;
    }),
  datasetEvalIdToEdit: null,
  setDatasetEvalIdToEdit: (id) =>
    set((state) => {
      state.evaluationsSlice.datasetEvalIdToEdit = id;
    }),
  resetEvaluationsSlice: () =>
    set((state) => {
      state.evaluationsSlice.comparisonCriteria = null;
      state.evaluationsSlice.datasetEvalIdToEdit = null;
    }),
});
