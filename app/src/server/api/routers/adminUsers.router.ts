import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";

export const adminUsersRouter = createTRPCRouter({
  impersonate: protectedProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);

      const userToImpersonate = await ctx.prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (!userToImpersonate) {
        throw new Error("User not found");
      }

      console.log("impersonate");
      console.log("cookies", ctx?.cookies);
      console.log(ctx?.cookies["next-auth.session-token"]);
      const sessionToken = ctx?.cookies["next-auth.session-token"];
      console.log("sessionToken", sessionToken);

      await prisma.session.update({
        where: {
          sessionToken,
        },
        data: {
          userId: userToImpersonate.id,
        },
      });
    }),
});
