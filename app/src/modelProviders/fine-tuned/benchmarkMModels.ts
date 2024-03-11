import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources";
import { typedFineTune, type TypedFineTune } from "~/types/dbColumns.types";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";
import { getAnyscaleCompletion } from "./getAnyscaleCompletion";
import { getFireworksCompletion } from "./getFireworksCompletion";
import { prisma } from "~/server/db";

const comparisonModels: Record<string, string> = {
  "be471838-1e03-4cc3-8d82-fc7cc46a6dc5": "5fb02c53-eca8-473a-a280-982190f0a9a3", // n
  "17762704-afe7-4ae8-b3ec-07b77a5bc61f": "10a09d50-c518-4d3f-87da-3706778a1c1d", // a
  "b7c229ff-6bc8-4dc4-9ee0-d2b8e1aa7e29": "7e9e51de-151e-4162-9a01-47b18c7044be", // e
};

const timedCompletion = async (completion: Promise<ChatCompletion>) => {
  const startTime = Date.now();
  const finished = await completion;
  return {
    completion: finished,
    duration: Date.now() - startTime,
  };
};

export async function benchmarkMModels(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion> {
  if (process.env.ENABLE_BENCHMARKING !== "true") return getAnyscaleCompletion(fineTune, input);

  const comparisonModelId = comparisonModels[fineTune.id];

  const comparisonModel =
    comparisonModelId &&
    (await prisma.fineTune
      .findUnique({ where: { id: comparisonModelId } })
      .then((m) => m && typedFineTune(m)));

  if (!comparisonModel) return getAnyscaleCompletion(fineTune, input);

  const anyscaleCompletion = getAnyscaleCompletion(fineTune, input);
  const fireworksCompletion = getFireworksCompletion(comparisonModel, input);

  // Only send 5% of completions to PostHog
  if (Math.random() < 0.05)
    void Promise.allSettled([
      timedCompletion(anyscaleCompletion),
      timedCompletion(fireworksCompletion),
    ]).then(([anyscale, fireworks]) => {
      posthogServerClient?.capture({
        distinctId: fineTune.provider,
        event: "fireworks benchmark",
        properties: {
          model: fineTune.model,
          messages: input.messages,
          "error.anyscale": anyscale.status === "rejected",
          "error.fireworks": fireworks.status === "rejected",
          ...("value" in anyscale
            ? {
                "duration.anyscale": anyscale.value?.duration,
                "prompt_tokens.anyscale": anyscale.value?.completion?.usage?.prompt_tokens,
                "completion_tokens.anyscale": anyscale.value?.completion?.usage?.completion_tokens,
                "completion.anyscale": anyscale.value?.completion?.choices?.[0]?.message,
              }
            : {
                "error.anyscale.message": anyscale.reason?.message,
                "error.anyscale.stack": anyscale.reason?.stack,
              }),
          ...("value" in fireworks
            ? {
                "duration.fireworks": fireworks.value?.duration,
                "prompt_tokens.fireworks": fireworks.value?.completion?.usage?.prompt_tokens,
                "completion_tokens.fireworks":
                  fireworks.value?.completion?.usage?.completion_tokens,
                "completion.fireworks": fireworks.value?.completion?.choices?.[0]?.message,
              }
            : {
                "error.fireworks.message": fireworks.reason?.message,
                "error.fireworks.stack": fireworks.reason?.stack,
              }),
        },
      });
    });

  // return fireworksCompletion;
  return anyscaleCompletion;
  // return firstSuccessful([anyscaleCompletion, fireworksCompletion]);
}
