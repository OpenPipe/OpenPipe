import { type TaskList, run } from "graphile-worker";
import "dotenv/config";

import { env } from "~/env.mjs";
import { queryModel } from "./queryModel.task";
import { runNewEval } from "./runNewEval.task";

console.log("Starting worker");

const registeredTasks = [queryModel, runNewEval];

const taskList = registeredTasks.reduce((acc, task) => {
  acc[task.task.identifier] = task.task.handler;
  return acc;
}, {} as TaskList);

// Run a worker to execute jobs:
const runner = await run({
  connectionString: env.DATABASE_URL,
  concurrency: 50,
  // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
  noHandleSignals: false,
  pollInterval: 1000,
  taskList,
});

console.log("Worker successfully started");

await runner.promise;
