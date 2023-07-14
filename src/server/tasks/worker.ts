import { type TaskList, run } from "graphile-worker";
import "dotenv/config";
import "../../../sentry.server.config";

import { env } from "~/env.mjs";
import { queryLLM } from "./queryLLM.task";

const registeredTasks = [queryLLM];

const taskList = registeredTasks.reduce((acc, task) => {
  acc[task.task.identifier] = task.task.handler;
  return acc;
}, {} as TaskList);

async function main() {
  // Run a worker to execute jobs:
  const runner = await run({
    connectionString: env.DATABASE_URL,
    concurrency: 20,
    // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
    noHandleSignals: false,
    pollInterval: 1000,
    // you can set the taskList or taskDirectory but not both
    taskList,
    // or:
    //   taskDirectory: `${__dirname}/tasks`,
  });

  // Immediately await (or otherwise handled) the resulting promise, to avoid
  // "unhandled rejection" errors causing a process crash in the event of
  // something going wrong.
  await runner.promise;

  // If the worker exits (whether through fatal error or otherwise), the above
  // promise will resolve/reject.
}

main().catch((err) => {
  console.error("Unhandled error occurred running worker: ", err);
  process.exit(1);
});