import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources";
import { type TypedFineTune } from "~/types/dbColumns.types";
import { posthogServerClient } from "~/utils/analytics/serverAnalytics";
import { getAnyscaleCompletion } from "./getAnyscaleCompletion";
import { getModalCompletion } from "./getModalCompletion";
import { captureException } from "@sentry/node";

const firstSuccessful = <T>(promises: Promise<T>[]): Promise<T> => {
  let rejectCounter = 0;

  return new Promise((resolve, reject) => {
    promises.forEach((promise) => {
      promise.then(resolve).catch((error) => {
        captureException(error);
        rejectCounter++;
        if (rejectCounter === promises.length) {
          reject(error);
        }
      });
    });
  });
};

const timedCompletion = async (completion: Promise<ChatCompletion>) => {
  const startTime = Date.now();
  const finished = await completion;
  return {
    completion: finished,
    duration: Date.now() - startTime,
  };
};

export function benchmarkCompletions(
  fineTune: TypedFineTune,
  input: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion> {
  const modalCompletion = getModalCompletion(fineTune, input);
  const anyscaleCompletion = getAnyscaleCompletion(fineTune, input);

  // Only send 5% of completions to PostHog
  if (Math.random() < 0.05)
    void Promise.allSettled([
      timedCompletion(modalCompletion),
      timedCompletion(anyscaleCompletion),
    ]).then(([modal, anyscale]) => {
      posthogServerClient?.capture({
        distinctId: fineTune.provider,
        event: "inference comparison",
        properties: {
          model: fineTune.model,
          messages: input.messages,
          "error.modal": modal.status === "rejected",
          "error.anyscale": anyscale.status === "rejected",
          ...("value" in modal
            ? {
                "duration.modal": modal.value?.duration,
                "prompt_tokens.modal": modal.value?.completion?.usage?.prompt_tokens,
                "completion_tokens.modal": modal.value?.completion?.usage?.completion_tokens,
                "completion.modal": modal.value?.completion?.choices?.[0]?.message,
              }
            : {
                "error.modal.message": modal.reason?.message,
                "error.modal.stack": modal.reason?.stack,
              }),
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
        },
      });
    });

  return firstSuccessful([modalCompletion, anyscaleCompletion]);
}
