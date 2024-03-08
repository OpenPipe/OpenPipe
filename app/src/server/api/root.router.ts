import { createTRPCCaller, createTRPCRouter } from "~/server/api/trpc";

import { adminJobsRouter } from "./routers/adminJobs.router";
import { adminProjectsRouter } from "./routers/adminProjects.router";
import { adminUsersRouter } from "./routers/adminUsers.router";
import { archivesRouter } from "./routers/archives.router";
import { creditAdjustmentsRouter } from "./routers/creditAdjustments.router";
import { datasetEvalsRouter } from "./routers/datasetEvals.router";
import { datasetsRouter } from "./routers/datasets.router";
import { fineTunesRouter } from "./routers/fineTunes/fineTunes.router";
import { invoicesRouter } from "./routers/invoices.router";
import { loggedCallsRouter } from "./routers/loggedCalls.router";
import { projectsRouter } from "./routers/projects.router";
import { usageRouter } from "./routers/usage.router";
import { pruningRulesRouter } from "./routers/pruningRules.router";
import { usersRouter } from "./routers/users.router";
import { paymentsRouter } from "./routers/payments.router";
import { monitorsRouter } from "./routers/monitors.router";
import { nodeEntriesRouter } from "./routers/nodeEntries.router";

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
  datasetEvals: datasetEvalsRouter,
  pruningRules: pruningRulesRouter,
  fineTunes: fineTunesRouter,
  users: usersRouter,
  adminJobs: adminJobsRouter,
  adminUsers: adminUsersRouter,
  adminProjects: adminProjectsRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  monitors: monitorsRouter,
  nodeEntries: nodeEntriesRouter,
  archives: archivesRouter,
  creditAdjustments: creditAdjustmentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export const createAppRouterCaller = createTRPCCaller(appRouter);
