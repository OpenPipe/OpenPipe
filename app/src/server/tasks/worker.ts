import { type TaskList, run, parseCronItems } from "graphile-worker";
import "dotenv/config";
import "../../../sentry.server.config";

import { env } from "~/env.mjs";
import { importDatasetEntries } from "./importDatasetEntries.task";
import { trainFineTune } from "./fineTuning/trainFineTune.task";
import { checkFineTuneStatus } from "./fineTuning/checkFineTuneStatus.task";
import { checkOpenaiFineTuneStatus } from "./fineTuning/checkOpenaiFineTuneStatus.task";
import { generateTestSetEntry } from "./generateTestSetEntry.task";
import { evaluateTestSetEntries } from "./evaluateTestSetEntries.task";
import { countDatasetEntryTokens } from "./fineTuning/countDatasetEntryTokens.task";
import { relabelDatasetEntry } from "./relabelDatasetEntry.task";
import type defineTask from "./defineTask";
import { pgPool } from "../db";
import { generateInvoices } from "./generateInvoices.task";
import { chargeInvoices } from "./chargeInvoices.task";

console.log("Starting worker...");

// Prevent verbose logging every time a task succeeds:
// https://github.com/graphile/worker/blob/5ddf9de1b0ca5b26e95aba75a834abd77c03e9ee/src/worker.ts#L322C14-L322C40
process.env.NO_LOG_SUCCESS = "true";

const registeredTasks: ReturnType<typeof defineTask<any>>[] = [
  importDatasetEntries,
  trainFineTune,
  checkFineTuneStatus,
  checkOpenaiFineTuneStatus,
  generateTestSetEntry,
  evaluateTestSetEntries,
  countDatasetEntryTokens,
  relabelDatasetEntry,
  generateInvoices,
  chargeInvoices,
];

const taskList = registeredTasks.reduce((acc, task) => {
  acc[task.task.identifier] = task.task.handler;
  return acc;
}, {} as TaskList);

// Run a worker to execute jobs:
const runner = await run({
  pgPool,
  concurrency: env.WORKER_CONCURRENCY,
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
    {
      task: checkOpenaiFineTuneStatus.task.identifier,
      // run once a minute for now
      pattern: "* * * * *",
      identifier: checkOpenaiFineTuneStatus.task.identifier,
      options: {
        backfillPeriod: 1000 * 60,
      },
    },
    {
      task: generateInvoices.task.identifier,
      // run at the beginning of each month
      pattern: "* * * * *", // TODO: Set "0 0 1 * *". This is a temp change to test in production. It runs every minute.
      identifier: generateInvoices.task.identifier,
    },
    {
      task: chargeInvoices.task.identifier,
      // run on 2nd day of each month, after invoices are created
      pattern: "0 * * * *", // TODO: Set "0 0 2 * *". This is a temp change to test in production. It runs every hour.
      identifier: chargeInvoices.task.identifier,
    },
  ]),
});

console.log("Worker successfully started");

await runner.promise;
