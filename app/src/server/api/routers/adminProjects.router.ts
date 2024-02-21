import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";

export const adminProjectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ input, ctx }) => {
    await requireIsAdmin(ctx);

    return await prisma.project.findMany({
      include: { projectUsers: { include: { user: true } }, fineTunes: true },
    });
  }),
});
