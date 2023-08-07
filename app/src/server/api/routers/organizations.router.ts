import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyOrganization, requireNothing } from "~/utils/accessControl";

export const organizationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    requireNothing(ctx);

    if (!userId) {
      return null;
    }

    const organizations = await prisma.organization.findMany({
      where: {
        organizationUsers: {
          some: { userId: ctx.session.user.id },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!organizations.length) {
      const newOrgId = uuidv4();
      const [newOrg] = await prisma.$transaction([
        prisma.organization.create({
          data: {
            id: newOrgId,
            personalOrgUserId: userId,
          },
        }),
        prisma.organizationUser.create({
          data: {
            userId,
            organizationId: newOrgId,
            role: "ADMIN",
          },
        }),
      ]);
      organizations.push(newOrg);
    }

    return organizations;
  }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    requireNothing(ctx);
    return await prisma.organization.findUnique({
      where: {
        id: input.id,
      },
    });
  }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ name: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyOrganization(input.id, ctx);
      return await prisma.organization.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.updates.name,
        },
      });
    }),
});
