import "dotenv/config";

import defineTask from "./defineTask";
import { type TaskList, run } from "graphile-worker";
import { env } from "~/env.mjs";

import "../../../sentry.server.config";

export type TestTask = { i: number };

// When a new eval is created, we want to run it on all existing outputs, but return the new eval first
export const testTask = defineTask<TestTask>({
  id: "testTask",
  handler: (task) => {
    console.log("ran task ", task.i);

    void new Promise((_resolve, reject) => setTimeout(reject, 500));
    return Promise.resolve();
  },
});

const registeredTasks = [testTask];

const taskList = registeredTasks.reduce((acc, task) => {
  acc[task.task.identifier] = task.task.handler;
  return acc;
}, {} as TaskList);

// process.on("unhandledRejection", (reason, promise) => {
//   console.log("Unhandled Rejection at:", reason?.stack || reason);
// });

// Run a worker to execute jobs:
const runner = await run({
  connectionString: env.DATABASE_URL,
  concurrency: 10,
  // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
  noHandleSignals: false,
  pollInterval: 1000,
  taskList,
});

console.log("Worker successfully started");

for (let i = 0; i < 10; i++) {
  await testTask.enqueue({ i });
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

await runner.promise;
