import { OrganizationUserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type TRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";

const isAdmin = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "ADMIN" },
  });

  return !!user;
};

// No-op method for protected routes that really should be accessible to anyone.
export const requireNothing = (ctx: TRPCContext) => {
  ctx.markAccessControlRun();
};

export const requireCanViewExperiment = async (experimentId: string, ctx: TRPCContext) => {
  await prisma.experiment.findFirst({
    where: { id: experimentId },
  });

  // Right now all experiments are publicly viewable, so this is a no-op.
  ctx.markAccessControlRun();
};

export const canModifyExperiment = async (experimentId: string, userId: string) => {
  const [adminUser, experiment] = await Promise.all([
    isAdmin(userId),
    prisma.experiment.findFirst({
      where: {
        id: experimentId,
        organization: {
          organizationUsers: {
            some: {
              role: { in: [OrganizationUserRole.ADMIN, OrganizationUserRole.MEMBER] },
              userId,
            },
          },
        },
      },
    }),
  ]);

  return adminUser || !!experiment;
};

export const requireCanModifyExperiment = async (experimentId: string, ctx: TRPCContext) => {
  const userId = ctx.session?.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!(await canModifyExperiment(experimentId, userId))) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  ctx.markAccessControlRun();
};
