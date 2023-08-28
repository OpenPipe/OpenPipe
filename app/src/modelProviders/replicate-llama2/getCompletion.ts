import { env } from "~/env.mjs";
import { type ReplicateLlama2Input, type ReplicateLlama2Output } from ".";
import { type CompletionResponse } from "../types";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN || "",
});

const modelIds: Record<ReplicateLlama2Input["model"], string> = {
  "7b-chat": "d24902e3fa9b698cc208b5e63136c4e26e828659a9f09827ca6ec5bb83014381",
  "13b-chat": "9dff94b1bed5af738655d4a7cbcdcde2bd503aa85c94334fe1f42af7f3dd5ee3",
  "70b-chat": "2c1608e18606fad2812020dc541930f2d0495ce32eee50074220b87300bc16e1",
};

export async function getCompletion(
  input: ReplicateLlama2Input,
  onStream: ((partialOutput: string[]) => void) | null,
): Promise<CompletionResponse<ReplicateLlama2Output>> {
  const start = Date.now();

  const { model, ...rest } = input;

  try {
    const prediction = await replicate.predictions.create({
      version: modelIds[model],
      input: rest,
    });

    const interval = onStream
      ? // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setInterval(async () => {
          const partialPrediction = await replicate.predictions.get(prediction.id);

          if (partialPrediction.output) onStream(partialPrediction.output as ReplicateLlama2Output);
        }, 500)
      : null;

    const resp = await replicate.wait(prediction, {});
    if (interval) clearInterval(interval);

    const timeToComplete = Date.now() - start;

    if (resp.error) throw new Error(resp.error as string);

    return {
      type: "success",
      statusCode: 200,
      value: resp.output as ReplicateLlama2Output,
      timeToComplete,
    };
  } catch (error: unknown) {
    console.error("ERROR IS", error);
    return {
      type: "error",
      message: (error as Error).message,
      autoRetry: true,
    };
  }
}
