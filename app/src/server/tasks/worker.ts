import { type TaskList, run } from "graphile-worker";
import "dotenv/config";
import "../../../sentry.server.config";

import { env } from "~/env.mjs";
import { queryModel } from "./queryModel.task";
import { runNewEval } from "./runNewEval.task";
import { importDatasetEntries } from "./importDatasetEntries.task";

console.log("Starting worker");

const registeredTasks = [queryModel, runNewEval, importDatasetEntries];

const taskList = registeredTasks.reduce((acc, task) => {
  acc[task.task.identifier] = task.task.handler;
  return acc;
}, {} as TaskList);

// Run a worker to execute jobs:
const runner = await run({
  connectionString: env.DATABASE_URL,
  concurrency: env.WORKER_CONCURRENCY,
  maxPoolSize: env.WORKER_MAX_POOL_SIZE,
  // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
  noHandleSignals: false,
  pollInterval: 1000,
  taskList,
});

console.log("Worker successfully started");

await runner.promise;
