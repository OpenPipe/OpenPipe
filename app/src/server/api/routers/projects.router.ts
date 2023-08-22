import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { generateApiKey } from "~/server/utils/generateApiKey";
import userProject from "~/server/utils/userProject";
import {
  requireCanModifyProject,
  requireCanViewProject,
  requireIsProjectAdmin,
  requireNothing,
} from "~/utils/accessControl";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    requireNothing(ctx);

    if (!userId) {
      return null;
    }

    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: { userId: ctx.session.user.id },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!projects.length) {
      // TODO: We should move this to a separate endpoint that is called on sign up
      const personalProject = await userProject(userId);
      projects.push(personalProject);
    }

    return projects;
  }),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    await requireCanViewProject(input.id, ctx);
    const [proj, userRole] = await prisma.$transaction([
      prisma.project.findUnique({
        where: {
          id: input.id,
        },
        include: {
          apiKeys: true,
          personalProjectUser: true,
          projectUsers: {
            include: {
              user: true,
            },
          },
          projectUserInvitations: true,
        },
      }),
      prisma.projectUser.findFirst({
        where: {
          userId: ctx.session.user.id,
          projectId: input.id,
          role: {
            in: ["ADMIN", "MEMBER", "VIEWER"],
          },
        },
      }),
    ]);

    if (!proj) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return {
      ...proj,
      role: userRole?.role ?? null,
    };
  }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), updates: z.object({ name: z.string() }) }))
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.id, ctx);
      return await prisma.project.update({
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
      const newProjectId = uuidv4();
      const [newProject] = await prisma.$transaction([
        prisma.project.create({
          data: {
            id: newProjectId,
            name: input.name,
          },
        }),
        prisma.projectUser.create({
          data: {
            userId: ctx.session.user.id,
            projectId: newProjectId,
            role: "ADMIN",
          },
        }),
        prisma.apiKey.create({
          data: {
            name: "Default API Key",
            projectId: newProjectId,
            apiKey: generateApiKey(),
          },
        }),
      ]);
      return newProject;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.id, ctx);
      return await prisma.project.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
