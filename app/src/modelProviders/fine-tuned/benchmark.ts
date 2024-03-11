import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources";
import { typedFineTune, type TypedFineTune } from "~/types/dbColumns.types";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";
import { getAnyscaleCompletion } from "./getAnyscaleCompletion";
import { getFireworksCompletion } from "./getFireworksCompletion";
import { prisma } from "~/server/db";
import { captureException } from "@sentry/node";

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

  runBenchmark({
    name: "fireworks benchmark",
    input,
    branches: { anyscale: anyscaleCompletion, fireworks: fireworksCompletion },
    reportingRate: 0.05,
  });
  return anyscaleCompletion;
}

function runBenchmark(config: {
  name: string;
  input: ChatCompletionCreateParamsNonStreaming;
  branches: Record<string, Promise<ChatCompletion>>;
  reportingRate: number;
}) {
  Promise.allSettled(
    Object.entries(config.branches).map(([name, completion]) =>
      timedCompletion(completion).then((result) => ({ name, ...result })),
    ),
  )
    .then((results) => {
      const report: Record<string, any> = {
        model: config.input.model,
        messages: config.input.messages,
      };

      results.forEach((result) => {
        if (result.status === "rejected") {
          report[`error.${result.reason.name}`] = true;
          report[`error.${result.reason.name}.message`] = result.reason?.message;
          report[`error.${result.reason.name}.stack`] = result.reason?.stack;
        } else if (result.status === "fulfilled") {
          report[`duration.${result.value.name}`] = result.value.duration;
          report[`prompt_tokens.${result.value.name}`] =
            result.value.completion?.usage?.prompt_tokens;
          report[`completion_tokens.${result.value.name}`] =
            result.value.completion?.usage?.completion_tokens;
          report[`completion.${result.value.name}`] =
            result.value.completion?.choices?.[0]?.message;
        }
      });

      if (Math.random() < config.reportingRate) {
        posthogServerClient?.capture({
          distinctId: "benchmarks",
          event: config.name,
          properties: report,
        });
      }
    })
    .catch((e) => captureException(e));
}
