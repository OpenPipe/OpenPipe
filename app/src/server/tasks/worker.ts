import { type TaskList, run, parseCronItems } from "graphile-worker";
import "dotenv/config";
import "../../../sentry.server.config";

import { env } from "~/env.mjs";
import { queryModel } from "./queryModel.task";
import { runNewEval } from "./runNewEval.task";
import { importDatasetEntries } from "./importDatasetEntries.task";
import { trainFineTune } from "./fineTuning/trainFineTune.task";
import { checkFineTuneStatus } from "./fineTuning/checkFineTuneStatus.task";
import { getTestResult } from "./getTestResult.task";
import type defineTask from "./defineTask";

console.log("Starting worker");

const registeredTasks: ReturnType<typeof defineTask<any>>[] = [
  queryModel,
  runNewEval,
  importDatasetEntries,
  trainFineTune,
  checkFineTuneStatus,
  getTestResult,
];

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
  parsedCronItems: parseCronItems([
    {
      task: checkFineTuneStatus.task.identifier,
      // run once a minute for now
      pattern: "* * * * *",
      identifier: checkFineTuneStatus.task.identifier,
      options: {
        backfillPeriod: 1000 * 60,
      },
    },
  ]),
});

console.log("Worker successfully started");

await runner.promise;
