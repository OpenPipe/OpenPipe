/* eslint-disable @typescript-eslint/no-unsafe-call */
import { isObject } from "lodash";
import { type JSONSerializable } from "../types";
import { Prisma } from "@prisma/client";
import { streamChatCompletion } from "./openai";
import { wsConnection } from "~/utils/wsConnection";
import { type ChatCompletion, type CompletionCreateParams } from "openai/resources/chat";

type CompletionResponse = {
  output: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  statusCode: number;
  errorMessage: string | null;
  timeToComplete: number
};

export async function getChatCompletion(
  payload: JSONSerializable,
  apiKey: string,
  channelId?: string,
): Promise<CompletionResponse> {
  const start = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const resp: CompletionResponse = {
    output: Prisma.JsonNull,
    errorMessage: null,
    statusCode: response.status,
    timeToComplete: 0
  };

  try {
    if (channelId) {
      const completion = streamChatCompletion(payload as unknown as CompletionCreateParams);
      let finalOutput: ChatCompletion | null = null;
      await (async () => {
        for await (const partialCompletion of completion) {
          finalOutput = partialCompletion
          wsConnection.emit("message", { channel: channelId, payload: partialCompletion });
        }
      })().catch((err) => console.error(err));
      resp.output = finalOutput as unknown as Prisma.InputJsonValue;
      resp.timeToComplete = Date.now() - start;
    } else {
      resp.timeToComplete = Date.now() - start;
      resp.output = await response.json();
    }

    if (!response.ok) {
      // If it's an object, try to get the error message
      if (
        isObject(resp.output) &&
        "error" in resp.output &&
        isObject(resp.output.error) &&
        "message" in resp.output.error
      ) {
        resp.errorMessage = resp.output.error.message?.toString() ?? "Unknown error";
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
