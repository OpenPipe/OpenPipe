import { sql } from "kysely";
import { kysely } from "~/server/db";

type RateLimitConfig = {
  capacity: number; // Maximum tokens in the bucket
  fillRate: number; // Tokens added to the bucket per second
};

export const rateLimit = async (key: string, config: RateLimitConfig): Promise<boolean> => {
  const tokensToAdd = sql`((extract(epoch from now()) - extract(epoch from "RateLimit"."lastUpdated")) * ${config.fillRate})`;

  const currentTokenCount = sql`least(${config.capacity}, "RateLimit".tokens + ${tokensToAdd})`;

  const query = sql<{ allowed: boolean; tokensLeft: number }>`
    insert into "RateLimit"(key, tokens, allowed, "lastUpdated")
    values (${key}, ${config.capacity} - 1, true, now())
    on conflict (key) do update set
      tokens = greatest(0, ${currentTokenCount} - 1),
      allowed = round(${currentTokenCount}) > 0,
      "lastUpdated" = case when ${currentTokenCount} > 0 then now() else "RateLimit"."lastUpdated" end
    returning allowed, tokens as "tokensLeft";
  `;
  const result = await query.execute(kysely);

  return result.rows[0]?.allowed ?? false;
};

// Example usage with simplified rate limit configuration
// Allow up to 50 bursty requests with a fill rate of 10 tokens per second
export const fireworksTestSetLimit = () =>
  rateLimit("fireworksTestSet", { capacity: 30, fillRate: 10 });
