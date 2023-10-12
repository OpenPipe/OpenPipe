import { type Helpers, type Task, makeWorkerUtils, type TaskSpec } from "graphile-worker";
import { env } from "~/env.mjs";

let workerUtilsPromise: ReturnType<typeof makeWorkerUtils> | null = null;

function workerUtils() {
  if (!workerUtilsPromise) {
    workerUtilsPromise = makeWorkerUtils({
      connectionString: env.DATABASE_URL,
    });
  }
  return workerUtilsPromise;
}

function defineTask<TPayload>(
  taskIdentifier: string,
  taskHandler: (payload: TPayload, helpers: Helpers) => Promise<void>,
) {
  const enqueue = async (payload: TPayload, spec?: TaskSpec) => {
    // console.log("Enqueuing task", taskIdentifier, payload);

    const utils = await workerUtils();
    return await utils.addJob(taskIdentifier, payload, spec);
  };

  const handler = (payload: TPayload, helpers: Helpers) => {
    helpers.logger.debug(`Running task ${taskIdentifier} with payload: ${JSON.stringify(payload)}`);
    return taskHandler(payload, helpers);
  };

  const task = {
    identifier: taskIdentifier,
    handler: handler as Task,
  };

  return {
    runNow: async (payload: TPayload) => {
      const utils = await workerUtils();

      return taskHandler(payload, utils);
    },
    enqueue,
    task,
  };
}

export default defineTask;
