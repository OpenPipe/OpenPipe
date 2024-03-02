import { type TaskList, run, parseCronItems } from "graphile-worker";
import "dotenv/config";
import "../../../sentry.server.config";

import { env } from "~/env.mjs";
import { trainFineTune } from "./fineTuning/trainFineTune.task";
import { checkFineTuneStatus } from "./fineTuning/checkFineTuneStatus.task";
import { checkOpenaiFineTuneStatus } from "./fineTuning/checkOpenaiFineTuneStatus.task";
import { generateTestSetEntry } from "./generateTestSetEntry.task";
import { evaluateTestSetEntries } from "./evaluateTestSetEntries.task";
import { countDatasetEntryTokens } from "./fineTuning/countDatasetEntryTokens.task";
import type defineTask from "./defineTask";
import { pgPool } from "../db";
import { generateInvoices } from "./generateInvoices.task";
import { chargeInvoices } from "./chargeInvoices.task";
import { processNode } from "./nodes/processNodes/processNode.task";
import { feedMonitors } from "./nodes/feedMonitors.task";

console.log("Starting worker...");

// Prevent verbose logging every time a task succeeds:
// https://github.com/graphile/worker/blob/5ddf9de1b0ca5b26e95aba75a834abd77c03e9ee/src/worker.ts#L322C14-L322C40
process.env.NO_LOG_SUCCESS = "true";

const registeredTasks: ReturnType<typeof defineTask<any>>[] = [
  trainFineTune,
  checkFineTuneStatus,
  checkOpenaiFineTuneStatus,
  generateTestSetEntry,
  evaluateTestSetEntries,
  countDatasetEntryTokens,
  generateInvoices,
  chargeInvoices,
  processNode,
  feedMonitors,
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
      match: "* * * * *",
      identifier: checkFineTuneStatus.task.identifier,
      options: {
        backfillPeriod: 1000 * 60,
        queueName: "check-fine-tune-status",
      },
    },
    {
      task: checkOpenaiFineTuneStatus.task.identifier,
      // run once a minute for now
      match: "* * * * *",
      identifier: checkOpenaiFineTuneStatus.task.identifier,
      options: {
        backfillPeriod: 1000 * 60,
        queueName: "check-openai-fine-tune-status",
      },
    },
    {
      task: generateInvoices.task.identifier,
      // run at 2:10 AM UTC, on the first day of each month
      match: "10 2 1 * *",
      identifier: generateInvoices.task.identifier,
      options: {
        backfillPeriod: 1000 * 60 * 60 * 24 * 7,
        queueName: "charge-invoices",
      },
    },

    // If an invoice payment failed, it will retry on the next day
    {
      task: chargeInvoices.task.identifier,
      // run at 2:10 AM UTC, on the second day of each month
      match: "10 2 2 * *",
      identifier: chargeInvoices.task.identifier,
      options: {
        backfillPeriod: 1000 * 60 * 60 * 24 * 7,
        queueName: "charge-invoices",
      },
    },
  ]),
});

console.log("Worker successfully started");

await runner.promise;
