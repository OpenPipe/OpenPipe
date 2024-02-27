import { sql } from "kysely";
import { kysely } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { RateLimitError } from "openai";
import { env } from "~/env.mjs";
import { CONCURRENCY_RATE_LIMITS } from "./const";

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

export const recordOngoingRequestEnd = async (id: string | undefined) => {
  if (id) await kysely.deleteFrom("OngoingRequest").where("id", "=", id).execute();
};

const checkRateLimitHit = async (projectId: string) => {
  const result = await kysely
    .selectFrom("Project as p")
    .where("p.id", "=", projectId)
    .select([
      sql<number>`(SELECT COUNT(req.id) FROM "OngoingRequest" as req WHERE req."projectId" = p.id AND req."createdAt" > NOW() - INTERVAL '10 minutes')`.as(
        "currentRequests",
      ),
      "p.rateLimit",
      "p.slug",
    ])
    .executeTakeFirst();

  if ((result?.currentRequests ?? 0) > 500) {
    console.log(
      `[${new Date().toISOString()}] over 500 concurrent requests ${JSON.stringify(result)}`,
    );
  }

  if (result && result.currentRequests >= result.rateLimit) {
    if (result.rateLimit === CONCURRENCY_RATE_LIMITS.BASE_LIMIT) {
      const message = `Your project has a rate limit of ${CONCURRENCY_RATE_LIMITS.BASE_LIMIT} concurrent requests. Add a payment method to automatically increase your rate limit to ${CONCURRENCY_RATE_LIMITS.INCREASED_LIMIT} concurrent requests. ${env.NEXT_PUBLIC_HOST}/p/${result.slug}/billing/payment-methods`;
      throw new RateLimitError(
        429,
        {
          error: message,
        },
        message,
        {},
      );
    } else {
      const message = `Your project has a rate limit of ${result.rateLimit} concurrent requests. Contact us at support@openpipe.ai to increase your rate limit further.`;
      throw new RateLimitError(429, { error: message }, message, {});
    }
  }
};
