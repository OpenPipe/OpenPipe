// Import necessary dependencies
import { quickAddJob, type Helpers, type Task } from "graphile-worker";
import { env } from "~/env.mjs";

// Define the defineTask function
function defineTask<TPayload>(
  taskIdentifier: string,
  taskHandler: (payload: TPayload, helpers: Helpers) => Promise<void>
) {
  const enqueue = async (payload: TPayload) => {
    console.log("Enqueuing task", taskIdentifier, payload);
    await quickAddJob({ connectionString: env.DATABASE_URL }, taskIdentifier, payload);
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