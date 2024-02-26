import { describe, expect, it } from "vitest";
import { fireworksTestSetLimit, rateLimit } from "./rateLimits";
import { sleep } from "~/server/utils/sleep";

const rateLimitConfig = {
  capacity: 5, // Allow 5 requests
  fillRate: 1, // 1 token added per second
};

describe("rateLimit", () => {
  it("allows requests under capacity", async () => {
    const key = Math.random().toString();
    let result = true;
    // Perform 4 requests, which should all be allowed
    for (let i = 0; i < 4; i++) {
      result = result && (await rateLimit(key, rateLimitConfig));
    }
    expect(result).toBe(true);
  });

  it("blocks requests over capacity", async () => {
    const key = Math.random().toString();
    let result = true;
    // Perform 6 requests, the last one should be blocked
    for (let i = 0; i < 6; i++) {
      result = await rateLimit(key, rateLimitConfig);
    }
    expect(result).toBe(false);
  });

  it("resets capacity after 1 second due to fill rate", async () => {
    const key = Math.random().toString();
    // Use up the capacity
    for (let i = 0; i < 5; i++) {
      expect(await rateLimit(key, rateLimitConfig)).toBe(true);
    }

    // Try one more request, which should be blocked
    const blockedResult = await rateLimit(key, rateLimitConfig);
    expect(blockedResult).toBe(false);

    await rateLimit(key, rateLimitConfig);

    // Wait for 1 second to allow the bucket to refill
    await sleep(1000);
    const result = await rateLimit(key, rateLimitConfig);
    expect(result).toBe(true);
  });

  it("calls the fireworksTestSetLimit function", async () => {
    const result = await fireworksTestSetLimit();
    expect(result).toBe(true);
  });
});
