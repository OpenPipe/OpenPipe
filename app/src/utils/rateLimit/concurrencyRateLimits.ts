import { sql } from "kysely";
import { kysely } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { RateLimitError } from "openai";

export const recordOngoingRequestStart = async (projectId: string, proceed = true) => {
  if (!proceed) return;

  await checkRateLimitHit(projectId);

  const requestId = await kysely
    .insertInto("OngoingRequest")
    .values({
      id: uuidv4(),
      projectId: projectId,
    })
    .returning(["id"])
    .executeTakeFirst();

  return requestId?.id;
};

export const recordOngoingRequestEnd = (id: string | undefined) => {
  if (id) void kysely.deleteFrom("OngoingRequest").where("id", "=", id).execute();
};

const checkRateLimitHit = async (projectId: string) => {
  const result = await kysely
    .selectFrom("Project as p")
    .leftJoin("OngoingRequest as req", (join) =>
      join
        .on("p.id", "=", sql`req."projectId"::uuid`)
        .on("req.createdAt", ">", sql`NOW() - INTERVAL '10 minutes'`),
    )
    .where("p.id", "=", projectId)
    .groupBy("p.id")
    .select(
      sql<boolean>`CASE WHEN COUNT(req.id) >= p."rateLimit" THEN FALSE ELSE TRUE END`.as(
        "canProceed",
      ),
    )
    .executeTakeFirst();

  if (!result?.canProceed) {
    throw new RateLimitError(
      429,
      { error: "Completion rate limit exceeded" },
      "Completion rate limit exceeded",
      {},
    );
  }
};
