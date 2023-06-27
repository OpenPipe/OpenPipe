import { isObject } from "lodash";
import { type JSONSerializable } from "../types";
import { Prisma } from "@prisma/client";

type CompletionResponse = {
  output: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  statusCode: number;
  errorMessage: string | null;
};

export async function getChatCompletion(
  payload: JSONSerializable,
  apiKey: string
): Promise<CompletionResponse> {
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
  };

  try {
    resp.output = await response.json();

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
