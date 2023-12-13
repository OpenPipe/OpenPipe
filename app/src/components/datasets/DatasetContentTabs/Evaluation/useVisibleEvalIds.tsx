import { useQueryParam, JsonParam, withDefault, encodeQueryParams } from "use-query-params";

import { useDataset } from "~/utils/hooks";

export const EMPTY_EVALS_KEY = "_empty_";

export const useVisibleEvalIds = () => {
  const dataset = useDataset().data;
  const [visibleEvals, setVisibleEvals] = useQueryParam<{
    headToHeadEvalIds: string[];
    showFieldComparison: boolean;
  }>(
    "visibleEvals",
    withDefault(JsonParam, {
      headToHeadEvalIds: [],
      showFieldComparison: false,
    }),
  );

  const headToHeadEvalIds = visibleEvals.headToHeadEvalIds;
  const setVisibleHeadToHeadEvalIds = (newVisibleEvalIds: string[]) => {
    setVisibleEvals({
      headToHeadEvalIds: newVisibleEvalIds,
      showFieldComparison: visibleEvals.showFieldComparison,
    });
  };

  const allHeadToHeadEvalIds =
    dataset?.datasetEvals
      .filter((datasetEval) => datasetEval.type === "HEAD_TO_HEAD")
      ?.map((datasetEval) => datasetEval.id) || [];

  const allFieldComparisonEvalIds =
    dataset?.datasetEvals
      .filter((datasetEval) => datasetEval.type === "FIELD_COMPARISON")
      ?.map((datasetEval) => datasetEval.id) || [];

  const ensureEvalShown = (evalId: string) => {
    if (headToHeadEvalIds.length === 0 || headToHeadEvalIds.includes(evalId)) return;
    if (headToHeadEvalIds.includes(EMPTY_EVALS_KEY)) {
      setVisibleHeadToHeadEvalIds([evalId]);
    } else {
      setVisibleHeadToHeadEvalIds([...headToHeadEvalIds, evalId]);
    }
  };

  const toggleEvalVisiblity = (evalId: string) => {
    if (allFieldComparisonEvalIds.includes(evalId)) {
      setVisibleEvals({
        headToHeadEvalIds,
        showFieldComparison: !visibleEvals.showFieldComparison,
      });
      return;
    }

    if (headToHeadEvalIds.length === 0) {
      // All evals were visible, so we're only hiding this one.
      if (allHeadToHeadEvalIds.length === 1) {
        // There's only one eval, so we're hiding all of them.
        setVisibleHeadToHeadEvalIds([EMPTY_EVALS_KEY]);
      } else {
        setVisibleHeadToHeadEvalIds(allHeadToHeadEvalIds.filter((id) => id != evalId));
      }
    } else if (headToHeadEvalIds.includes(EMPTY_EVALS_KEY)) {
      // All evals were hidden, so we're only showing this one.
      setVisibleHeadToHeadEvalIds([evalId]);
    } else if (
      headToHeadEvalIds.length === allHeadToHeadEvalIds.length - 1 &&
      !headToHeadEvalIds.includes(evalId)
    ) {
      // This was the only hidden eval, so we're now showing all of them
      setVisibleHeadToHeadEvalIds([]);
    } else if (headToHeadEvalIds.length === 1 && headToHeadEvalIds.includes(evalId)) {
      // This is the only visible eval, so we're hiding it.
      setVisibleHeadToHeadEvalIds([EMPTY_EVALS_KEY]);
    } else if (headToHeadEvalIds.includes(evalId)) {
      // This eval was visible, so we're hiding it.
      setVisibleHeadToHeadEvalIds(headToHeadEvalIds.filter((id) => id !== evalId));
    } else if (!headToHeadEvalIds.includes(evalId)) {
      // This eval was hidden, so we're showing it.
      setVisibleHeadToHeadEvalIds([...headToHeadEvalIds, evalId]);
    }
  };

  let completeVisibleEvalIds = headToHeadEvalIds;
  if (headToHeadEvalIds.includes(EMPTY_EVALS_KEY)) {
    completeVisibleEvalIds = [];
  } else if (headToHeadEvalIds.length === 0) {
    completeVisibleEvalIds = allHeadToHeadEvalIds;
  }

  if (visibleEvals.showFieldComparison) {
    completeVisibleEvalIds = completeVisibleEvalIds.concat(allFieldComparisonEvalIds);
  }

  return {
    visibleEvalIds: completeVisibleEvalIds,
    toggleEvalVisiblity,
    toggleFieldComparisonVisiblity: () => {
      setVisibleEvals({
        headToHeadEvalIds,
        showFieldComparison: !visibleEvals.showFieldComparison,
      });
    },
    ensureEvalShown,
  };
};

export const constructVisibleEvalIdsQueryParams = (
  headToHeadEvalIds: string[],
): Record<string, any> => {
  const queryParams = {
    visibleEvals: {
      headToHeadEvalIds,
      showFieldComparison: false,
    },
  };

  const encodedParams = encodeQueryParams({ visibleEvals: JsonParam }, queryParams);

  return Object.fromEntries(
    Object.entries(encodedParams).map(([key, value]) => [key, value?.toString()]),
  );
};
