import { runAllEvals } from "../utils/evaluations";
import defineTask from "./defineTask";

export type RunNewEvalJob = {
  experimentId: string;
};

// When a new eval is created, we want to run it on all existing outputs, but return the new eval first
export const runNewEval = defineTask<RunNewEvalJob>("runNewEval", async (task) => {
  const { experimentId } = task;
  await runAllEvals(experimentId);
});

export const queueRunNewEval = async (experimentId: string) => {
  // Evals are lower priority than completions
  await runNewEval.enqueue({ experimentId }, { priority: 4 });
};
