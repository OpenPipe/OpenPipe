import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";

export const loggedCallsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string(), page: z.number(), pageSize: z.number() }))
    .query(async ({ input, ctx }) => {
      const { projectId, page, pageSize } = input;

      await requireCanViewProject(projectId, ctx);

      const calls = await prisma.loggedCall.findMany({
        where: { projectId },
        orderBy: { requestedAt: "desc" },
        include: { tags: true, modelResponse: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const count = await prisma.loggedCall.count({
        where: { projectId },
      });

      return { count, calls };
    }),
});
