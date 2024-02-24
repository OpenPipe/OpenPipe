import { sql } from "kysely";
import { kysely } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { RateLimitError } from "openai";
import { env } from "~/env.mjs";

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
    .where("p.id", "=", projectId)
    .select([
      sql<boolean>`(SELECT COUNT(req.id) FROM "OngoingRequest" as req WHERE req."projectId" = p.id AND req."createdAt" > NOW() - INTERVAL '10 minutes') < p."rateLimit"`.as(
        "canProceed",
      ),
      "p.rateLimit",
      "p.slug",
    ])
    .executeTakeFirst();

  if (result && !result.canProceed) {
    if (result.rateLimit === 3) {
      const message = `Your project has a rate limit of 3 concurrent requests. Add a payment method to automatically increase your rate limit to 20 concurrent requests. ${env.NEXT_PUBLIC_HOST}/p/${result.slug}/billing/payment-methods`;
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
