import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { error, success } from "~/utils/errorHandling/standardResponses";
import {
  type AccessCheck,
  accessChecks,
  requireIsProjectAdmin,
  requireNothing,
} from "~/utils/accessControl";
import { sendProjectInvitation } from "~/server/emails/sendProjectInvitation";

export const usersRouter = createTRPCRouter({
  inviteToProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const user = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

      // Rate Limiting (10 invites per hour)
      const recentInvitationsCount = await prisma.userInvitation.count({
        where: {
          senderId: ctx.session.user.id,
          updatedAt: {
            gte: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour
          },
        },
      });

      if (recentInvitationsCount > 10) {
        return error("Invitation Limit Exceeded: Please wait before sending more invites.");
      }

      // Checking if a user is already a member of the project
      if (user) {
        const existingMembership = await prisma.projectUser.findUnique({
          where: {
            projectId_userId: {
              projectId: input.projectId,
              userId: user.id,
            },
          },
        });

        if (existingMembership) {
          return error(`The user ${input.email} has already accepted an invitation`);
        }
      }

      // Checking if a user is already invited to the project
      const existingInvitation = await prisma.userInvitation.findFirst({
        where: {
          projectId: input.projectId,
          email: input.email,
          isCanceled: false,
        },
      });

      if (existingInvitation) {
        return error(`The user ${input.email} is already invited to this project`);
      }

      const invitation = await prisma.userInvitation.create({
        data: {
          projectId: input.projectId,
          email: input.email,
          role: input.role,
          invitationToken: uuidv4(),
          senderId: ctx.session.user.id,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      try {
        await sendProjectInvitation({
          invitationToken: invitation.invitationToken,
          recipientEmail: input.email,
          invitationSenderName: ctx.session.user.name || "",
          invitationSenderEmail: ctx.session.user.email || "",
          projectName: invitation.project.name,
        });
      } catch (e) {
        // If we fail to send the email, we should delete the invitation
        await prisma.userInvitation.delete({
          where: {
            invitationToken: invitation.invitationToken,
          },
        });
        return error("Failed to send email");
      }

      return success();
    }),
  getProjectInvitation: protectedProcedure
    .input(
      z.object({
        invitationToken: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      requireNothing(ctx);

      const invitation = await prisma.userInvitation.findFirst({
        where: {
          invitationToken: input.invitationToken,
          isCanceled: false,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
          sender: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return invitation;
    }),
  acceptProjectInvitation: protectedProcedure
    .input(
      z.object({
        invitationToken: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireNothing(ctx);

      const invitation = await prisma.userInvitation.findFirst({
        where: {
          invitationToken: input.invitationToken,
          isCanceled: false,
        },
        include: {
          project: {
            select: {
              slug: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await prisma.$transaction([
        prisma.projectUser.create({
          data: {
            projectId: invitation.projectId,
            userId: ctx.session.user.id,
            role: invitation.role,
          },
        }),
        prisma.userInvitation.delete({
          where: {
            invitationToken: input.invitationToken,
          },
        }),
        prisma.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            lastViewedProjectId: invitation.projectId,
          },
        }),
      ]);

      return success(invitation.project.slug);
    }),
  cancelProjectInvitation: protectedProcedure
    .input(
      z.object({
        invitationToken: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireNothing(ctx);

      const invitation = await prisma.userInvitation.findFirst({
        where: {
          invitationToken: input.invitationToken,
          isCanceled: false,
        },
      });

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await prisma.userInvitation.update({
        where: {
          invitationToken: input.invitationToken,
        },
        data: {
          isCanceled: true,
        },
      });
      return success();
    }),
  editProjectUserRole: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      await prisma.projectUser.update({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
        data: {
          role: input.role,
        },
      });

      return success();
    }),
  removeUserFromProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.session.user.id) {
        requireNothing(ctx);
      } else {
        await requireIsProjectAdmin(input.projectId, ctx);
      }

      const owner = await prisma.projectUser.findFirst({
        where: {
          projectId: input.projectId,
          role: "OWNER",
        },
      });

      if (input.userId === owner?.userId) {
        throw new TRPCError({
          message: "You can't remove the owner of the project",
          code: "FORBIDDEN",
        });
      }

      await prisma.projectUser.delete({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
      });

      return success();
    }),
  updateLastViewedProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireNothing(ctx);

      await prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          lastViewedProjectId: input.projectId,
        },
      });

      return success();
    }),
  checkAccess: protectedProcedure
    .input(
      z.object({
        accessCheck: z.enum(Object.keys(accessChecks) as [AccessCheck, ...AccessCheck[]]),
        projectId: z.string().nullable(),
      }),
    )
    .output(
      z.discriminatedUnion("access", [
        z.object({ access: z.literal(true) }),
        z.object({ access: z.literal(false), message: z.string() }),
      ]),
    )
    .query(async ({ input, ctx }) => {
      const { accessCheck } = input;

      requireNothing(ctx);

      try {
        if (accessCheck === "requireNothing") accessChecks.requireNothing(ctx);
        if (accessCheck === "requireIsAdmin") await accessChecks.requireIsAdmin(ctx);
        if (
          accessCheck === "requireCanViewProject" ||
          accessCheck === "requireCanModifyProject" ||
          accessCheck === "requireIsProjectAdmin"
        ) {
          if (!input.projectId) return { access: false, message: "invalid project id" };
          await accessChecks[accessCheck](input.projectId, ctx);
        }
        return { access: true };
      } catch (e) {
        return { access: false, message: (e as TRPCError).message };
      }
    }),
});
