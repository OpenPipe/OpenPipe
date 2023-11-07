import { TrainerV1 } from "./trainerV1";
import { env } from "~/env.mjs";
import { z } from "zod";

export const trainerv1 = new TrainerV1({
  BASE: `https://openpipe-${env.MODAL_ENVIRONMENT}--trainer-v1${
    env.MODAL_USE_LOCAL_DEPLOYMENTS ? "-dev" : ""
  }.modal.run`,
});

const outputSchema = z.object({
  id: z.string(),
  choices: z.array(
    z.object({
      text: z.string(),
      finish_reason: z.enum(["stop", "length"]),
    }),
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }),
});

type ModalInput = {
  model: string;
  prompt: string;
  n?: number;
  max_tokens?: number | null;
  temperature?: number;
};

const inferenceBase = `https://openpipe-${env.MODAL_ENVIRONMENT}--inference-server-v1${
  env.MODAL_USE_LOCAL_DEPLOYMENTS ? "-dev" : ""
}.modal.run`;

export const runInference = async (args: ModalInput) => {
  const resp = await fetch(inferenceBase, {
    method: "POST",
    body: JSON.stringify(args),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await resp.json();
  const output = outputSchema.safeParse(json);
  if (output.success) {
    return output.data;
  } else {
    console.error("Failed to parse output from modal. JSON: ", json, "Error:", output.error);
    throw new Error("Failed to parse output from modal");
  }
};
