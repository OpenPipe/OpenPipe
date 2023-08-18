/* eslint-disable @typescript-eslint/no-unsafe-call */
import { isArray, isString } from "lodash-es";
import OpenAI, { APIError } from "openai";

import { type CompletionResponse } from "../types";
import { type OpenpipeChatInput, type OpenpipeChatOutput } from ".";
import frontendModelProvider from "./frontend";

const modelEndpoints: Record<OpenpipeChatInput["model"], string> = {
  "Open-Orca/OpenOrcaxOpenChat-Preview2-13B": "https://5ef82gjxk8kdys-8000.proxy.runpod.net/v1",
  // "Open-Orca/OpenOrca-Platypus2-13B": "https://lt5qlel6qcji8t-8000.proxy.runpod.net/v1",
  // "stabilityai/StableBeluga-13B": "https://vcorl8mxni2ou1-8000.proxy.runpod.net/v1",
  "NousResearch/Nous-Hermes-Llama2-13b": "https://ncv8pw3u0vb8j2-8000.proxy.runpod.net/v1",
  "jondurbin/airoboros-l2-13b-gpt4-2.0": "https://9nrbx7oph4btou-8000.proxy.runpod.net/v1",
};

export async function getCompletion(
  input: OpenpipeChatInput,
  onStream: ((partialOutput: OpenpipeChatOutput) => void) | null,
): Promise<CompletionResponse<OpenpipeChatOutput>> {
  const { model, messages, ...rest } = input;

  const templatedPrompt = frontendModelProvider.models[model].templatePrompt?.(messages);

  if (!templatedPrompt) {
    return {
      type: "error",
      message: "Failed to generate prompt",
      autoRetry: false,
    };
  }

  const openai = new OpenAI({
    baseURL: modelEndpoints[model],
  });
  const start = Date.now();
  let finalCompletion: OpenpipeChatOutput = "";

  try {
    if (onStream) {
      const resp = await openai.completions.create(
        { model, prompt: templatedPrompt, ...rest, stream: true },
        {
          maxRetries: 0,
        },
      );

      for await (const part of resp) {
        finalCompletion += part.choices[0]?.text;
        onStream(finalCompletion);
      }
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Streaming failed to return a completion",
          autoRetry: false,
        };
      }
    } else {
      const resp = await openai.completions.create(
        { model, prompt: templatedPrompt, ...rest, stream: false },
        {
          maxRetries: 0,
        },
      );
      finalCompletion = resp.choices[0]?.text || "";
      if (!finalCompletion) {
        return {
          type: "error",
          message: "Failed to return a completion",
          autoRetry: false,
        };
      }
    }
    const timeToComplete = Date.now() - start;

    return {
      type: "success",
      statusCode: 200,
      value: finalCompletion,
      timeToComplete,
    };
  } catch (error: unknown) {
    if (error instanceof APIError) {
      // The types from the sdk are wrong
      const rawMessage = error.message as string | string[];
      // If the message is not a string, stringify it
      const message = isString(rawMessage)
        ? rawMessage
        : isArray(rawMessage)
        ? rawMessage.map((m) => m.toString()).join("\n")
        : (rawMessage as any).toString();
      return {
        type: "error",
        message,
        autoRetry: error.status === 429 || error.status === 503,
        statusCode: error.status,
      };
    } else {
      console.error(error);
      return {
        type: "error",
        message: (error as Error).message,
        autoRetry: true,
      };
    }
  }
}
