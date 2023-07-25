import { env } from "~/env.mjs";
import { type ReplicateLlama2Input, type ReplicateLlama2Output } from ".";
import { type CompletionResponse } from "../types";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN || "",
});

const modelIds: Record<ReplicateLlama2Input["model"], string> = {
  "7b-chat": "3725a659b5afff1a0ba9bead5fac3899d998feaad00e07032ca2b0e35eb14f8a",
  "13b-chat": "5c785d117c5bcdd1928d5a9acb1ffa6272d6cf13fcb722e90886a0196633f9d3",
  "70b-chat": "e951f18578850b652510200860fc4ea62b3b16fac280f83ff32282f87bbd2e48",
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
