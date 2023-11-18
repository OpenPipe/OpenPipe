import { useQueryParam, JsonParam, withDefault } from "use-query-params";

export const useVisibleEvalIds = () => {
  const [visibleEvalIds, setVisibleEvalIds] = useQueryParam<string[]>(
    "evals",
    withDefault(JsonParam, []),
  );

  const showEval = (evalId: string) => setVisibleEvalIds([...visibleEvalIds, evalId]);

  const removeEval = (evalId: string) => {
    setVisibleEvalIds(visibleEvalIds.filter((id) => id !== evalId));
  };

  return { visibleEvalIds, setVisibleEvalIds, showEval, removeEval };
};
