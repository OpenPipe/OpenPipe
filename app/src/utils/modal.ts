import { z } from "zod";
import { env } from "~/env.mjs";

const trainerBase = `https://openpipe-${env.MODAL_ENVIRONMENT}--trainer-v1${
  env.MODAL_USE_LOCAL_DEPLOYMENTS ? "-dev" : ""
}.modal.run`;

const inferenceBase = `https://openpipe-${env.MODAL_ENVIRONMENT}--inference-server-v1${
  env.MODAL_USE_LOCAL_DEPLOYMENTS ? "-dev" : ""
}.modal.run`;

export const startTraining = async (args: { fine_tune_id: string; base_url: string }) => {
  const resp = await fetch(`${trainerBase}/start_training`, {
    method: "POST",
    body: JSON.stringify(args),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (resp.status !== 202) {
    throw new Error(`Failed to start training job: ${resp.status} ${resp.statusText}`);
  }

  return z
    .object({
      call_id: z.string(),
    })
    .parse(await resp.json());
};

export const trainingStatus = async (args: { callId: string }) => {
  const resp = await fetch(`${trainerBase}/training_status?call_id=${args.callId}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return z
    .object({
      status: z.enum(["running", "done", "error"]),
    })
    .parse(await resp.json());
};

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
  max_tokens?: number;
  temperature?: number;
};

export const runInference = async (args: ModalInput) => {
  const resp = await fetch(inferenceBase, {
    method: "POST",
    body: JSON.stringify(args),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json = await resp.json();

  console.log("GOT JSON", json);
  return outputSchema.parse(json);
};
