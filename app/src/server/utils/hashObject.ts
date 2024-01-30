import crypto from "crypto";
import { type JsonValue } from "type-fest";
import type { z } from "zod";

import { type chatCompletionInputReqPayload } from "~/types/shared.types";

function sortKeys(obj: JsonValue): JsonValue {
  if (typeof obj !== "object" || obj === null) {
    // Not an object or array, return as is
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  // Get keys and sort them
  const keys = Object.keys(obj).sort();
  const sortedObj = {};

  for (const key of keys) {
    // @ts-expect-error not worth fixing types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    sortedObj[key] = sortKeys(obj[key]);
  }

  return sortedObj;
}

export function hashRequest(
  modelId: string,
  reqPayload: z.infer<typeof chatCompletionInputReqPayload>,
): string {
  const obj = {
    modelId,
    messages: reqPayload.messages,
    function_call: reqPayload.function_call,
    functions: reqPayload.functions,
    tool_choice: reqPayload.tool_choice,
    tools: reqPayload.tools,
    max_tokens: reqPayload.max_tokens,
    response_format: reqPayload.response_format,
  };
  return hashObject(obj as JsonValue);
}

export default function hashObject(obj: JsonValue): string {
  // Sort object keys recursively
  const sortedObj = sortKeys(obj);

  // Convert to JSON and hash it
  const str = JSON.stringify(sortedObj);
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}
