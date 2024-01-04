import { type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { generateApiKey } from "~/server/utils/generateApiKey";
import userProject from "~/server/utils/userProject";
import {
  requireCanModifyProject,
  requireCanViewProject,
  requireIsProjectAdmin,
  requireNothing,
} from "~/utils/accessControl";
import { success } from "~/utils/errorHandling/standardResponses";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    requireNothing(ctx);

    if (!userId) {
      return null;
    }

    const projects = await kysely
      .selectFrom("Project as p")
      .innerJoin("ProjectUser as pu", (eb) =>
        eb.onRef("pu.projectId", "=", "p.id").on("pu.userId", "=", userId),
      )
      .selectAll("p")
      .orderBy("pu.role", "asc")
      .orderBy("p.createdAt", "asc")
      .execute();

    if (!projects.length) {
      // TODO: We should move this to a separate endpoint that is called on sign up
      const personalProject = await userProject(userId);
      projects.push(personalProject);
    }

    return projects;
  }),
  get: protectedProcedure
    .input(z.object({ projectSlug: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findUniqueOrThrow({
        where: {
          slug: input.projectSlug,
        },
      });

      await requireCanViewProject(project.id, ctx);

      const proj = await kysely
        .selectFrom("Project as p")
        .where("p.id", "=", project.id)
        .selectAll("p")
        .select((eb) => [
          jsonArrayFrom(
            eb
              .selectFrom("ApiKey")
              .select(["name", "apiKey", "provider", "readOnly"])
              .whereRef("projectId", "=", "p.id"),
          ).as("apiKeys"),
          jsonObjectFrom(
            eb
              .selectFrom("User as u")
              .select(["u.id", "u.name", "u.email"])
              .whereRef("u.id", "=", "p.personalProjectUserId"),
          ).as("personalProjectUser"),
          jsonArrayFrom(
            eb
              .selectFrom("ProjectUser as pu")
              .innerJoin("User as u", "u.id", "pu.userId")
              .select(["pu.createdAt", "pu.role", "u.id as userId", "u.name", "u.email"])
              .whereRef("pu.projectId", "=", "p.id")
              .orderBy("pu.createdAt", "asc")
              // Take advantage of fact that ADMIN is alphabetically before MEMBER and VIEWER
              .orderBy("pu.role", "asc"),
          ).as("projectUsers"),
          jsonArrayFrom(
            eb
              .selectFrom("UserInvitation as ui")
              .selectAll("ui")
              .whereRef("ui.projectId", "=", "p.id"),
          ).as("projectUserInvitations"),
          eb
            .selectFrom("User as u")
            .where("u.id", "=", ctx.session.user.id)
            .leftJoin("ProjectUser as pu", (eb) =>
              eb.onRef("pu.userId", "=", "u.id").onRef("pu.projectId", "=", "p.id"),
            )
            .select("pu.role")
            .as("userRole"),
        ])
        .executeTakeFirst();

      if (!proj) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { apiKeys, projectUsers, projectUserInvitations, ...rest } = proj;

      // If the user is a viewer, they should not see the full-access API key
      const openpipeFullAccessKey =
        apiKeys.find(
          (apiKey) =>
            apiKey.provider === "OPENPIPE" && !apiKey.readOnly && proj.userRole !== "VIEWER",
        )?.apiKey ?? null;
      const openpipeReadOnlyKey =
        apiKeys.find((apiKey) => apiKey.provider === "OPENPIPE" && apiKey.readOnly)?.apiKey ?? null;

      const openAiApiKey = apiKeys.find((apiKey) => apiKey.provider === "OPENAI")?.apiKey ?? null;
      const condensedOpenAIKey = openAiApiKey
        ? openAiApiKey.slice(0, 5) + "..." + openAiApiKey.slice(-5)
        : null;

      const revisedProjectUsers =
        proj.userRole === "VIEWER"
          ? projectUsers.filter(
              (user) => user.role !== "VIEWER" || user.userId === ctx.session.user.id,
            )
          : projectUsers;

      return {
        ...rest,
        openpipeFullAccessKey,
        openpipeReadOnlyKey,
        condensedOpenAIKey,
        projectUsers: revisedProjectUsers,
        projectUserInvitations: proj.userRole !== "VIEWER" ? projectUserInvitations : [],
      };
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          name: z.string().optional(),
          openaiApiKey: z.string().nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyProject(input.id, ctx);
      if (input.updates.name) {
        await prisma.project.update({
          where: {
            id: input.id,
          },
          data: {
            name: input.updates.name,
          },
        });
      }
      if (input.updates.openaiApiKey !== undefined) {
        const transactionActions: Prisma.PrismaPromise<unknown>[] = [
          // Delete the existing API key
          prisma.apiKey.deleteMany({
            where: {
              projectId: input.id,
              provider: "OPENAI",
            },
          }),
        ];
        // Create a new API key if the user has provided one
        if (input.updates.openaiApiKey !== null) {
          transactionActions.push(
            prisma.apiKey.create({
              data: {
                name: "OpenAI API Key",
                projectId: input.id,
                apiKey: input.updates.openaiApiKey,
                provider: "OPENAI",
              },
            }),
          );
        }
        await prisma.$transaction(transactionActions);
      }
      return success("Project updated");
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
        prisma.apiKey.create({
          data: {
            name: "Read-Only API Key",
            projectId: newProjectId,
            apiKey: generateApiKey(),
            readOnly: true,
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
