import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";
import { kysely } from "~/server/db";
import { sql } from "kysely";

export const adminUsersRouter = createTRPCRouter({
  impersonate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);

      const userToImpersonate = await ctx.prisma.user.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!userToImpersonate) {
        throw new Error("User not found");
      }

      // For some reason in production the cookie is "__Secure-next-auth.session-token" but in dev it's "next-auth.session-token"
      const sessionToken =
        ctx?.cookies["__Secure-next-auth.session-token"] ?? ctx?.cookies["next-auth.session-token"];

      await prisma.session.update({
        where: {
          sessionToken,
        },
        data: {
          userId: userToImpersonate.id,
        },
      });
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);

      const resp = await kysely
        .selectFrom("User")
        .where(
          sql`"name" ILIKE ${"%" + input.query + "%"} OR "email" ILIKE ${"%" + input.query + "%"}`,
        )
        .limit(10)
        .select(["id", "name", "email", "image"])
        .orderBy("name", "desc") // Change this to whichever field you'd like to sort by
        .execute();

      return resp;
    }),
});
