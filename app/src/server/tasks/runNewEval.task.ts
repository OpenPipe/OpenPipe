import { runAllEvals } from "../utils/evaluations";
import defineTask from "./defineTask";

export type RunNewEvalJob = {
  experimentId: string;
};

// When a new eval is created, we want to run it on all existing outputs, but return the new eval first
export const runNewEval = defineTask<RunNewEvalJob>({
  id: "runNewEval",
  handler: async (task) => {
    const { experimentId } = task;
    await runAllEvals(experimentId);
  },
  specDefaults: {
    priority: 4,
  },
});
