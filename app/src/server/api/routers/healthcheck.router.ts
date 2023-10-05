import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

export const healthcheckRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(async () => {
    // check database connection
    await prisma.experiment.findFirst();

    return { status: "ok" };
  }),
});
