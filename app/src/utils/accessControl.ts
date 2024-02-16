import { ProjectUserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { type TRPCContext } from "~/server/api/trpc";
import { prisma } from "~/server/db";

const isAdmin = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "ADMIN" },
  });

  return !!user;
};

const requireUserId = (ctx: TRPCContext) => {
  if (!ctx.session?.user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "This function is only available to signed-in users.",
    });
  }
  return ctx.session.user.id;
};

// No-op method for protected routes that really should be accessible to anyone.
export const requireNothing = (ctx: TRPCContext) => {
  ctx.markAccessControlRun();
};

export const requireCanViewProject = async (projectId: string, ctx: TRPCContext) => {
  ctx.markAccessControlRun();

  const userId = requireUserId(ctx);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });

  const canView = await prisma.projectUser.findFirst({
    where: {
      userId,
      projectId,
    },
  });

  if (user?.role !== "ADMIN" && !canView) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
    });
    // Automatically add the user to the project if it's public
    if (project?.isPublic) {
      await prisma.projectUser.create({
        data: {
          userId,
          projectId,
          role: "VIEWER",
        },
      });
    } else {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to view this project.",
      });
    }
  }
};

export const requireCanModifyProject = async (projectId: string, ctx: TRPCContext) => {
  ctx.markAccessControlRun();

  const userId = requireUserId(ctx);

  const canModify = await prisma.projectUser.findFirst({
    where: {
      userId,
      projectId,
      role: { in: [ProjectUserRole.OWNER, ProjectUserRole.ADMIN, ProjectUserRole.MEMBER] },
    },
  });

  if (!canModify) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Only project members can perform this action.",
    });
  }
};

export const requireIsProjectAdmin = async (projectId: string, ctx: TRPCContext) => {
  ctx.markAccessControlRun();

  const userId = requireUserId(ctx);

  const isAdmin = await prisma.projectUser.findFirst({
    where: {
      userId,
      projectId,
      role: { in: [ProjectUserRole.OWNER, ProjectUserRole.ADMIN] },
    },
  });

  if (!isAdmin) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Only project admins can perform this action.",
    });
  }
};

export const requireIsAdmin = async (ctx: TRPCContext) => {
  ctx.markAccessControlRun();

  const userId = requireUserId(ctx);

  if (!(await isAdmin(userId))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be an admin to perform this action.",
    });
  }
};

export const accessChecks = {
  requireNothing,
  requireCanViewProject,
  requireCanModifyProject,
  requireIsProjectAdmin,
  requireIsAdmin,
} as const;

export type AccessCheck = keyof typeof accessChecks;
