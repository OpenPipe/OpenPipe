import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireIsAdmin } from "~/utils/accessControl";
import { success } from "~/utils/errorHandling/standardResponses";

export const adminProjectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number(),
        searchQuery: z.string().optional(),
        sortOrder: z
          .object({
            field: z.enum(["createdAt", "name", "slug", "fineTunesCount"]),
            order: z.enum(["asc", "desc"]),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);

      const { searchQuery, sortOrder, page, pageSize } = input;

      let baseQuery = kysely
        .selectFrom("Project as p")
        .leftJoin("FineTune as ft", "ft.projectId", "p.id")
        .leftJoin("ProjectUser as pu", "pu.projectId", "p.id")
        .leftJoin("User as u", "u.id", "pu.userId")
        .select((eb) => [
          "p.id",
          "p.slug",
          "p.createdAt",
          "p.name",
          "p.rateLimit",
          sql<number>`(SELECT COUNT(DISTINCT ft.id) FROM "FineTune" as ft WHERE ft."projectId" = p.id)`.as(
            `fineTunesCount`,
          ),
          sql<number>`(SELECT SUM(ca.amount) FROM "CreditAdjustment" as ca WHERE ca."projectId" = p.id)`.as(
            "credits",
          ),
          jsonArrayFrom(
            eb
              .selectFrom("FineTune as ft")
              .select(["ft.id as fineTuneId", "ft.slug", "ft.baseModel"])
              .whereRef("ft.projectId", "=", "p.id")
              .orderBy("ft.id"),
          ).as("fineTunes"),
          jsonArrayFrom(
            eb
              .selectFrom("ProjectUser as pu")
              .leftJoin("User as u", "u.id", "pu.userId")
              .select(["u.id", "u.name", "u.email", "u.image", "pu.role"])
              .whereRef("pu.projectId", "=", "p.id")
              .orderBy("u.id"),
          ).as("projectUsers"),
          jsonArrayFrom(
            eb
              .selectFrom("UsageLog as ul")
              .select(["ul.id as usageLogId", "ul.createdAt as usageLogCreatedAt"])
              .whereRef("ul.projectId", "=", "p.id")
              .orderBy("ul.createdAt", "desc")
              .limit(1),
          ).as("lastUsageLog"),
        ]);
      if (searchQuery) {
        baseQuery = baseQuery.where(
          sql`"p"."name" ILIKE ${"%" + searchQuery + "%"} OR "p"."slug" ILIKE ${
            "%" + searchQuery + "%"
          } OR "u"."name" ILIKE ${"%" + searchQuery + "%"} OR "u"."email" ILIKE ${
            "%" + searchQuery + "%"
          } OR "ft"."slug" ILIKE ${"%" + searchQuery + "%"} OR "ft"."baseModel" ILIKE ${
            "%" + searchQuery + "%"
          }`,
        );
      }

      if (sortOrder) {
        if (sortOrder.field === "fineTunesCount") {
          baseQuery = baseQuery.orderBy(`${sortOrder.field}`, sortOrder.order);
        } else {
          baseQuery = baseQuery.orderBy(`p.${sortOrder.field}`, sortOrder.order);
        }
      } else {
        baseQuery = baseQuery.orderBy("p.createdAt", "desc");
      }

      const projects = await baseQuery
        .groupBy("p.id")
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();

      const count = await prisma.project.count();

      return { projects, count };
    }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), rateLimit: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireIsAdmin(ctx);

      const { id, rateLimit } = input;

      const project = await prisma.project.findUniqueOrThrow({
        where: { id },
      });

      await prisma.project.update({
        where: { id },
        data: {
          rateLimit: rateLimit || project.rateLimit,
        },
      });

      return success("Project updated!");
    }),
});
