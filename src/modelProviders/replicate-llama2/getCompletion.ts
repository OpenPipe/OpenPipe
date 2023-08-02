import { env } from "~/env.mjs";
import { type ReplicateLlama2Input, type ReplicateLlama2Output } from ".";
import { type CompletionResponse } from "../types";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN || "",
});

const modelIds: Record<ReplicateLlama2Input["model"], string> = {
  "7b-chat": "058333670f2a6e88cf1b29b8183405b17bb997767282f790b82137df8c090c1f",
  "13b-chat": "d5da4236b006f967ceb7da037be9cfc3924b20d21fed88e1e94f19d56e2d3111",
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
