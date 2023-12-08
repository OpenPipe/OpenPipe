import { createTRPCRouter } from "~/server/api/trpc";
import { projectsRouter } from "./routers/projects.router";
import { usageRouter } from "./routers/usage.router";
import { loggedCallsRouter } from "./routers/loggedCalls.router";
import { datasetsRouter } from "./routers/datasets.router";
import { datasetEntriesRouter } from "./routers/datasetEntries.router";
import { datasetEvalsRouter } from "./routers/datasetEvals.router";
import { pruningRulesRouter } from "./routers/pruningRules.router";
import { fineTunesRouter } from "./routers/fineTunes.router";
import { usersRouter } from "./routers/users.router";
import { adminJobsRouter } from "./routers/adminJobs.router";
import { adminUsersRouter } from "./routers/adminUsers.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  usage: usageRouter,
  loggedCalls: loggedCallsRouter,
  datasets: datasetsRouter,
  datasetEntries: datasetEntriesRouter,
  datasetEvals: datasetEvalsRouter,
  pruningRules: pruningRulesRouter,
  fineTunes: fineTunesRouter,
  users: usersRouter,
  adminJobs: adminJobsRouter,
  adminUsers: adminUsersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
