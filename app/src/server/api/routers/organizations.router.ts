import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateApiKey } from "~/server/utils/generateApiKey";
import {
  requireCanModifyOrganization,
  requireCanViewOrganization,
  requireIsOrgAdmin,
  requireNothing,
} from "~/utils/accessControl";

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
        createdAt: "asc",
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
        prisma.apiKey.create({
          data: {
            name: "Default API Key",
            organizationId: newOrgId,
            apiKey: generateApiKey(),
          },
        }),
      ]);
      organizations.push(newOrg);
    }

    return organizations;
  }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewOrganization(input.id, ctx);
    const [org, userRole] = await prisma.$transaction([
      prisma.organization.findUnique({
        where: {
          id: input.id,
        },
        include: {
          apiKeys: true,
        },
      }),
      prisma.organizationUser.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.id,
          role: {
            in: ["ADMIN", "MEMBER"],
          },
        },
      }),
    ]);

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      ...org,
      role: userRole?.role ?? null,
    };
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
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireNothing(ctx);
      const newOrgId = uuidv4();
      const [newOrg] = await prisma.$transaction([
        prisma.organization.create({
          data: {
            id: newOrgId,
            name: input.name,
          },
        }),
        prisma.organizationUser.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: newOrgId,
            role: "ADMIN",
          },
        }),
        prisma.apiKey.create({
          data: {
            name: "Default API Key",
            organizationId: newOrgId,
            apiKey: generateApiKey(),
          },
        }),
      ]);
      return newOrg;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireIsOrgAdmin(input.id, ctx);
      return await prisma.organization.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
