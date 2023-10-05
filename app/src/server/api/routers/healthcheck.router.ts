import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const healthcheckRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => {
    return { status: "ok" };
  }),
});
