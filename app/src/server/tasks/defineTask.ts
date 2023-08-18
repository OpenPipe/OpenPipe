import { type Helpers, type Task, makeWorkerUtils } from "graphile-worker";
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
  const enqueue = async (payload: TPayload, runAt?: Date) => {
    console.log("Enqueuing task", taskIdentifier, payload);
    await (await workerUtils()).addJob(taskIdentifier, payload, { runAt });
  };

  const handler = (payload: TPayload, helpers: Helpers) => {
    helpers.logger.info(`Running task ${taskIdentifier} with payload: ${JSON.stringify(payload)}`);
    return taskHandler(payload, helpers);
  };

  const task = {
    identifier: taskIdentifier,
    handler: handler as Task,
  };

  return {
    enqueue,
    task,
  };
}

export default defineTask;
