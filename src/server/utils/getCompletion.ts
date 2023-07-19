/* eslint-disable @typescript-eslint/no-unsafe-call */
import { isObject } from "lodash-es";
import { Prisma } from "@prisma/client";
import { streamChatCompletion } from "./openai";
import { wsConnection } from "~/utils/wsConnection";
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";
import { type OpenAIChatModel } from "../types";
import { env } from "~/env.mjs";
import { countOpenAIChatTokens } from "~/utils/countTokens";
import { rateLimitErrorMessage } from "~/sharedStrings";

export type CompletionResponse = {
  output: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  statusCode: number;
  errorMessage: string | null;
  timeToComplete: number;
  promptTokens?: number;
  completionTokens?: number;
};

export async function getCompletion(
  payload: CompletionCreateParams,
  channel?: string,
): Promise<CompletionResponse> {
  return getOpenAIChatCompletion(payload, channel);
}

export async function getOpenAIChatCompletion(
  payload: CompletionCreateParams,
  channel?: string,
): Promise<CompletionResponse> {
  // If functions are enabled, disable streaming so that we get the full response with token counts
  if (payload.functions?.length) payload.stream = false;
  const start = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const resp: CompletionResponse = {
    output: Prisma.JsonNull,
    errorMessage: null,
    statusCode: response.status,
    timeToComplete: 0,
  };

  try {
    if (payload.stream) {
      const completion = streamChatCompletion(payload as unknown as CompletionCreateParams);
      let finalOutput: ChatCompletion | null = null;
      await (async () => {
        for await (const partialCompletion of completion) {
          finalOutput = partialCompletion;
          wsConnection.emit("message", { channel, payload: partialCompletion });
        }
      })().catch((err) => console.error(err));
      if (finalOutput) {
        resp.output = finalOutput as unknown as Prisma.InputJsonValue;
        resp.timeToComplete = Date.now() - start;
      }
    } else {
      resp.timeToComplete = Date.now() - start;
      resp.output = await response.json();
    }

    if (!response.ok) {
      if (response.status === 429) {
        resp.errorMessage = rateLimitErrorMessage;
      } else if (
        isObject(resp.output) &&
        "error" in resp.output &&
        isObject(resp.output.error) &&
        "message" in resp.output.error
      ) {
        // If it's an object, try to get the error message
        resp.errorMessage = resp.output.error.message?.toString() ?? "Unknown error";
      }
    }

    if (isObject(resp.output) && "usage" in resp.output) {
      const usage = resp.output.usage as unknown as ChatCompletion.Usage;
      resp.promptTokens = usage.prompt_tokens;
      resp.completionTokens = usage.completion_tokens;
    } else if (isObject(resp.output) && "choices" in resp.output) {
      const model = payload.model as unknown as OpenAIChatModel;
      resp.promptTokens = countOpenAIChatTokens(model, payload.messages);
      const choices = resp.output.choices as unknown as ChatCompletion.Choice[];
      const message = choices[0]?.message;
      if (message) {
        const messages = [message];
        resp.completionTokens = countOpenAIChatTokens(model, messages);
      }
    }
  } catch (e) {
    console.error(e);
    if (response.ok) {
      resp.errorMessage = "Failed to parse response";
    }
  }

  return resp;
}
