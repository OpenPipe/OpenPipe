import { TrainerV1 } from "./trainerV1";
import { env } from "~/env.mjs";
import { z } from "zod";
import { captureException } from "@sentry/node";
import { pick } from "lodash-es";

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
  max_tokens?: number;
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

  const respText = await resp.text();
  if (!resp.ok) {
    captureException("Failed to run inference.", {
      extra: {
        response: respText,
        ...pick(args, ["model", "n", "max_tokens", "temperature"]),
      },
    });
    throw new Error("Failed to run inference");
  }

  let json;
  try {
    json = JSON.parse(respText);
  } catch (e) {
    // captureException
    captureException("Failed to parse response from modal.", {
      extra: {
        response: respText,
        ...pick(args, ["model", "n", "max_tokens", "temperature"]),
      },
    });
    throw new Error("Failed to parse LLM response");
  }
  const output = outputSchema.safeParse(json);
  if (output.success) {
    return output.data;
  } else {
    captureException("Failed to validate output from modal.", {
      extra: {
        response: respText,
        ...pick(args, ["model", "n", "max_tokens", "temperature"]),
      },
    });
    throw new Error("Failed to validate LLM response");
  }
};
