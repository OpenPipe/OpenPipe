import { type ChatCompletion } from "openai/resources";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";

const BENCHMARKING_ENABLED = true;

export async function benchmarkCompletion<T extends string | ChatCompletion>(
  completionPromise: Promise<T>,
  provider: string,
): Promise<T> {
  if (!BENCHMARKING_ENABLED) return completionPromise;

  const startTime = Date.now();
  const completion = await completionPromise;
  const endTime = Date.now();
  const duration = endTime - startTime;

  if (typeof completion === "string") {
    return completion;
  }

  // Only send 10% of completions to PostHog
  if (Math.random() > 0.1) return completion;

  posthogServerClient?.capture({
    distinctId: provider,
    event: "inference completed",
    properties: {
      provider,
      duration,
      model: completion.model,
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
    },
  });

  return completion;
}
