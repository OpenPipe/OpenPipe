import { OrganizationUserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type TRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";

// No-op method for protected routes that really should be accessible to anyone.
export const requireNothing = (ctx: TRPCContext) => {
  ctx.markAccessControlRun();
};

export const requireCanAccessDataFlow = async (dataFlowId: string, ctx: TRPCContext) => {
  if (!ctx.session?.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const dataFlow = await prisma.dataFlow.findFirst({
    where: {
      id: dataFlowId,
      organization: {
        organizationUsers: {
          some: {
            role: { in: [OrganizationUserRole.ADMIN, OrganizationUserRole.MEMBER] },
            userId: ctx.session?.user.id,
          },
        },
      },
    },
  });

  return !!dataFlow;
};

export const requireCanViewExperiment = async (experimentId: string, ctx: TRPCContext) => {
  await prisma.experiment.findFirst({
    where: { id: experimentId },
  });

  // Right now all experiments are publicly viewable, so this is a no-op.
  ctx.markAccessControlRun();
};

export const canModifyExperiment = async (experimentId: string, userId: string) => {
  const experiment = await prisma.experiment.findFirst({
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
  });

  return !!experiment;
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
