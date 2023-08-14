import { promptVariantsRouter } from "~/server/api/routers/promptVariants.router";
import { createTRPCRouter } from "~/server/api/trpc";
import { experimentsRouter } from "./routers/experiments.router";
import { scenariosRouter } from "./routers/scenarios.router";
import { scenarioVariantCellsRouter } from "./routers/scenarioVariantCells.router";
import { scenarioVarsRouter } from "./routers/scenarioVariables.router";
import { evaluationsRouter } from "./routers/evaluations.router";
import { worldChampsRouter } from "./routers/worldChamps.router";
import { datasetsRouter } from "./routers/datasets.router";
import { datasetEntries } from "./routers/datasetEntries.router";
import { projectsRouter } from "./routers/projects.router";
import { dashboardRouter } from "./routers/dashboard.router";
import { loggedCallsRouter } from "./routers/loggedCalls.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  promptVariants: promptVariantsRouter,
  experiments: experimentsRouter,
  scenarios: scenariosRouter,
  scenarioVariantCells: scenarioVariantCellsRouter,
  scenarioVars: scenarioVarsRouter,
  evaluations: evaluationsRouter,
  worldChamps: worldChampsRouter,
  datasets: datasetsRouter,
  datasetEntries: datasetEntries,
  projects: projectsRouter,
  dashboard: dashboardRouter,
  loggedCalls: loggedCallsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
