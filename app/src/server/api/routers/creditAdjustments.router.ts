import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";
import { success } from "~/utils/errorHandling/standardResponses";

export const creditAdjustmentsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        amount: z.number(),
        description: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);
      const { projectId, amount, description } = input;

      await prisma.creditAdjustment.create({
        data: {
          amount,
          description,
          type: "BONUS",
          projectId,
        },
      });

      const credits = await prisma.creditAdjustment.aggregate({
        where: { projectId },
        _sum: { amount: true },
      });

      return success(
        "Credits added! Total available credits for this project: $" + credits._sum.amount,
      );
    }),
});
