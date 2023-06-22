import { promptVariantsRouter } from "~/server/api/routers/promptVariants.router";
import { createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  promptVariants: promptVariantsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
