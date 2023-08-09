import { promptVariantsRouter } from "~/server/api/routers/promptVariants.router";
import { createTRPCRouter } from "~/server/api/trpc";
import { experimentsRouter } from "./routers/experiments.router";
import { scenariosRouter } from "./routers/scenarios.router";
import { scenarioVariantCellsRouter } from "./routers/scenarioVariantCells.router";
import { templateVarsRouter } from "./routers/templateVariables.router";
import { evaluationsRouter } from "./routers/evaluations.router";
import { worldChampsRouter } from "./routers/worldChamps.router";
import { datasetsRouter } from "./routers/datasets.router";
import { datasetEntries } from "./routers/datasetEntries.router";
import { externalApiRouter } from "./routers/externalApi.router";
import { organizationsRouter } from "./routers/organizations.router";
import { dashboardRouter } from "./routers/dashboard.router";

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
  templateVars: templateVarsRouter,
  evaluations: evaluationsRouter,
  worldChamps: worldChampsRouter,
  datasets: datasetsRouter,
  datasetEntries: datasetEntries,
  organizations: organizationsRouter,
  dashboard: dashboardRouter,
  externalApi: externalApiRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
