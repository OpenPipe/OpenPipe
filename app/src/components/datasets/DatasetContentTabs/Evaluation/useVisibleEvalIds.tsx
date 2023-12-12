import { useQueryParam, JsonParam, withDefault } from "use-query-params";

import { useDataset } from "~/utils/hooks";

export const EMPTY_EVALS_KEY = "_empty_";

export const useVisibleEvalIds = () => {
  const dataset = useDataset().data;
  const [visibleEvals, setVisibleEvals] = useQueryParam<{
    hthEvalIds: string[];
    showFieldComparison: boolean;
  }>(
    "visibleEvals",
    withDefault(JsonParam, {
      hthEvalIds: [],
      showFieldComparison: false,
    }),
  );

  const hthEvalIds = visibleEvals.hthEvalIds;
  const setVisibleHthEvalIds = (newVisibleEvalIds: string[]) => {
    setVisibleEvals({
      hthEvalIds: newVisibleEvalIds,
      showFieldComparison: visibleEvals.showFieldComparison,
    });
  };

  const allHthEvalIds =
    dataset?.datasetEvals
      .filter((datasetEval) => datasetEval.type === "HEAD_TO_HEAD")
      ?.map((datasetEval) => datasetEval.id) || [];

  const allFieldComparisonEvalIds =
    dataset?.datasetEvals
      .filter((datasetEval) => datasetEval.type === "FIELD_COMPARISON")
      ?.map((datasetEval) => datasetEval.id) || [];

  const ensureEvalShown = (evalId: string) => {
    if (hthEvalIds.length === 0 || hthEvalIds.includes(evalId)) return;
    if (hthEvalIds.includes(EMPTY_EVALS_KEY)) {
      setVisibleHthEvalIds([evalId]);
    } else {
      setVisibleHthEvalIds([...hthEvalIds, evalId]);
    }
  };

  const toggleEvalVisiblity = (evalId: string) => {
    if (allFieldComparisonEvalIds.includes(evalId)) {
      setVisibleEvals({
        hthEvalIds,
        showFieldComparison: !visibleEvals.showFieldComparison,
      });
      return;
    }

    if (hthEvalIds.length === 0) {
      // All evals were visible, so we're only hiding this one.
      if (allHthEvalIds.length === 1) {
        // There's only one eval, so we're hiding all of them.
        setVisibleHthEvalIds([EMPTY_EVALS_KEY]);
      } else {
        setVisibleHthEvalIds(allHthEvalIds.filter((id) => id != evalId));
      }
    } else if (hthEvalIds.includes(EMPTY_EVALS_KEY)) {
      // All evals were hidden, so we're only showing this one.
      setVisibleHthEvalIds([evalId]);
    } else if (hthEvalIds.length === allHthEvalIds.length - 1 && !hthEvalIds.includes(evalId)) {
      // This was the only hidden eval, so we're now showing all of them
      setVisibleHthEvalIds([]);
    } else if (hthEvalIds.length === 1 && hthEvalIds.includes(evalId)) {
      // This is the only visible eval, so we're hiding it.
      setVisibleHthEvalIds([EMPTY_EVALS_KEY]);
    } else if (hthEvalIds.includes(evalId)) {
      // This eval was visible, so we're hiding it.
      setVisibleHthEvalIds(hthEvalIds.filter((id) => id !== evalId));
    } else if (!hthEvalIds.includes(evalId)) {
      // This eval was hidden, so we're showing it.
      setVisibleHthEvalIds([...hthEvalIds, evalId]);
    }
  };

  let completeVisibleEvalIds = hthEvalIds;
  if (hthEvalIds.includes(EMPTY_EVALS_KEY)) {
    completeVisibleEvalIds = [];
  } else if (hthEvalIds.length === 0) {
    completeVisibleEvalIds = allHthEvalIds;
  }

  if (visibleEvals.showFieldComparison) {
    completeVisibleEvalIds = completeVisibleEvalIds.concat(allFieldComparisonEvalIds);
  }

  return {
    visibleEvalIds: completeVisibleEvalIds,
    toggleEvalVisiblity,
    toggleFieldComparisonVisiblity: () => {
      setVisibleEvals({
        hthEvalIds,
        showFieldComparison: !visibleEvals.showFieldComparison,
      });
    },
    ensureEvalShown,
  };
};
