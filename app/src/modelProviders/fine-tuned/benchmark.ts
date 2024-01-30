import type { ChatCompletionCreateParams, ChatCompletion } from "openai/resources";
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
  input: ChatCompletionCreateParams,
): Promise<ChatCompletion> {
  const modalCompletion = getModalCompletion(fineTune, input);
  const anyscaleCompletion = getAnyscaleCompletion(fineTune, input);
  const anyscaleA10Completion = getAnyscaleCompletion(fineTune, input, "a10");

  // Only send 5% of completions to PostHog
  if (Math.random() < 0.05)
    void Promise.allSettled([
      timedCompletion(modalCompletion),
      timedCompletion(anyscaleCompletion),
      timedCompletion(anyscaleA10Completion),
    ]).then(([modal, anyscale, anyscaleA10]) => {
      posthogServerClient?.capture({
        distinctId: fineTune.provider,
        event: "inference comparison",
        properties: {
          model: fineTune.model,
          messages: input.messages,
          "error.modal": modal.status === "rejected",
          "error.anyscale": anyscale.status === "rejected",
          "error.anyscaleA10": anyscaleA10.status === "rejected",
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
          ...("value" in anyscaleA10
            ? {
                "duration.anyscaleA10": anyscaleA10.value?.duration,
                "prompt_tokens.anyscaleA10": anyscaleA10.value?.completion?.usage?.prompt_tokens,
                "completion_tokens.anyscaleA10":
                  anyscaleA10.value?.completion?.usage?.completion_tokens,
                "completion.anyscaleA10": anyscaleA10.value?.completion?.choices?.[0]?.message,
              }
            : {
                "error.anyscaleA10.message": anyscaleA10.reason?.message,
                "error.anyscaleA10.stack": anyscaleA10.reason?.stack,
              }),
        },
      });
    });

  return firstSuccessful([modalCompletion, anyscaleCompletion, anyscaleA10Completion]);
}
