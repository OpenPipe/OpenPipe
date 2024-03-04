import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { sql } from "kysely";

import { kysely } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { parseTags } from "~/server/utils/parseTags";
import { type filtersSchema } from "~/types/shared.types";
import { recordTagNames } from "~/utils/recordRequest";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";

export const updateLogTags = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/logs/update-tags",
      description: "Update tags for logged calls matching the provided filters",
      protect: true,
    },
  })
  .input(
    z.object({
      filters: z
        .object({
          field: z
            .string()
            .describe(
              "The field to filter on. Possible fields include: `model`, `completionId`, and `tags.your_tag_name`.",
            ),
          equals: z.union([z.string(), z.number(), z.boolean()]),
        })
        .array(),
      tags: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .describe(
          'Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }',
        ),
    }),
  )
  .output(z.object({ matchedLogs: z.number() }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    let tags: Record<string, string | null> = {};
    try {
      tags = parseTags(input.tags, true);
    } catch (e) {
      throw new TRPCError({
        message: `Failed to parse tags: ${(e as Error).message}`,
        code: "BAD_REQUEST",
      });
    }

    const tagNamesToDelete = Object.keys(tags).filter((key) => tags[key] === null);
    const tagsToUpsert = Object.entries(tags).filter(([, value]) => value !== null) as [
      string,
      string,
    ][];

    const filters: z.infer<typeof filtersSchema> = [];

    for (const filter of input.filters) {
      filters.push({
        field: filter.field,
        comparator: "=",
        value: filter.equals.toString(),
      });
    }

    const matchedLogs = await constructLoggedCallFiltersQuery({
      filters,
      projectId: ctx.key.projectId,
    })
      .select(sql<number>`count(*)::int`.as("count"))
      .executeTakeFirst();

    await kysely
      .updateTable("LoggedCall as updatedLoggedCall")
      .set({ updatedAt: new Date() })
      .where((eb) =>
        eb.exists(
          constructLoggedCallFiltersQuery({
            filters,
            projectId: ctx.key.projectId,
            baseQuery: eb.selectFrom("LoggedCall as lc"),
          })
            // @ts-expect-error baseQuery type is not propagated correctly
            .whereRef("lc.id", "=", "updatedLoggedCall.id"),
        ),
      )
      .execute();

    if (tagNamesToDelete.length > 0) {
      await kysely
        .deleteFrom("LoggedCallTag")
        .using((eb) =>
          constructLoggedCallFiltersQuery({
            filters,
            projectId: ctx.key.projectId,
            baseQuery: eb.selectFrom("LoggedCall as lc"),
          })
            .select("lc.id")
            .as("lc"),
        )
        .whereRef("LoggedCallTag.loggedCallId", "=", "lc.id")
        .where("LoggedCallTag.name", "in", tagNamesToDelete)
        .execute();
    }

    const loggedCallIds = await constructLoggedCallFiltersQuery({
      filters,
      projectId: ctx.key.projectId,
    })
      .select("lc.id")
      .execute()
      .then((rows) => rows.map((row) => row.id));

    const dataToInsert: {
      id: string;
      name: string;
      value: string;
      projectId: string;
      loggedCallId: string;
    }[] = [];

    // Iterate over each logged call and insert tags
    for (const loggedCallId of loggedCallIds) {
      // Prepare the insert data for each tag
      dataToInsert.push(
        ...tagsToUpsert.map(([name, value]) => ({
          id: uuidv4(),
          name,
          value,
          projectId: ctx.key.projectId,
          loggedCallId,
        })),
      );
    }

    if (dataToInsert.length) {
      await kysely
        .insertInto("LoggedCallTag")
        .columns(["name", "value", "projectId", "loggedCallId"])
        .values(dataToInsert)
        .onConflict((oc) =>
          oc.columns(["loggedCallId", "name"]).doUpdateSet((eb) => ({
            value: eb.ref("excluded.value"),
          })),
        )
        .execute();

      await recordTagNames(
        ctx.key.projectId,
        tagsToUpsert.map(([name]) => name),
      );
    }

    return { matchedLogs: matchedLogs?.count ?? 0 };
  });
