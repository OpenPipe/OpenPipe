import { useQueryParam, JsonParam, withDefault } from "use-query-params";

import { useDataset } from "~/utils/hooks";

export const EMPTY_EVALS_KEY = "_empty_";

export const useVisibleEvalIds = () => {
  const dataset = useDataset().data;
  const [visibleEvalIds, setVisibleEvalIds] = useQueryParam<string[]>(
    "evals",
    withDefault(JsonParam, []),
  );

  const allDatasetEvalIds = dataset?.datasetEvals?.map((datasetEval) => datasetEval.id) || [];

  const ensureEvalShown = (evalId: string) => {
    if (visibleEvalIds.length === 0 || visibleEvalIds.includes(evalId)) return;
    if (visibleEvalIds.includes(EMPTY_EVALS_KEY)) {
      setVisibleEvalIds([evalId]);
    } else {
      setVisibleEvalIds([...visibleEvalIds, evalId]);
    }
  };

  const toggleEvalVisiblity = (evalId: string) => {
    if (visibleEvalIds.length === 0) {
      // All evals were visible, so we're only hiding this one.
      if (allDatasetEvalIds.length === 1) {
        // There's only one eval, so we're hiding all of them.
        setVisibleEvalIds([EMPTY_EVALS_KEY]);
      } else {
        setVisibleEvalIds(allDatasetEvalIds.filter((id) => id != evalId));
      }
    } else if (visibleEvalIds.includes(EMPTY_EVALS_KEY)) {
      // All evals were hidden, so we're only showing this one.
      setVisibleEvalIds([evalId]);
    } else if (
      visibleEvalIds.length === allDatasetEvalIds.length - 1 &&
      !visibleEvalIds.includes(evalId)
    ) {
      // This was the only hidden eval, so we're now showing all of them
      setVisibleEvalIds([]);
    } else if (visibleEvalIds.length === 1 && visibleEvalIds.includes(evalId)) {
      // This is the only visible eval, so we're hiding it.
      setVisibleEvalIds([EMPTY_EVALS_KEY]);
    } else if (visibleEvalIds.includes(evalId)) {
      // This eval was visible, so we're hiding it.
      setVisibleEvalIds(visibleEvalIds.filter((id) => id !== evalId));
    } else if (!visibleEvalIds.includes(evalId)) {
      // This eval was hidden, so we're showing it.
      setVisibleEvalIds([...visibleEvalIds, evalId]);
    }
  };

  let completeVisibleEvalIds = visibleEvalIds;
  if (visibleEvalIds.includes(EMPTY_EVALS_KEY)) {
    completeVisibleEvalIds = [];
  } else if (visibleEvalIds.length === 0) {
    completeVisibleEvalIds = allDatasetEvalIds;
  }

  return {
    visibleEvalIds: completeVisibleEvalIds,
    toggleEvalVisiblity,
    ensureEvalShown,
  };
};
