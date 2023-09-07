import { env } from "~/env.mjs";
import { type ReplicateLlama2Input, type ReplicateLlama2Output } from ".";
import { type CompletionResponse } from "../types";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN || "",
});

const modelIds: Record<ReplicateLlama2Input["model"], string> = {
  "7b-chat": "658b64a1e83d7caaba4ef10d5ee9c12c40770003f45852f05c2564962f921d8e",
  "13b-chat": "7457c09004773f9f9710f7eb3b270287ffcebcfb23a13c8ec30cfb98f6bff9b2",
  "70b-chat": "4dfd64cc207097970659087cf5670e3c1fbe02f83aa0f751e079cfba72ca790a",
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
