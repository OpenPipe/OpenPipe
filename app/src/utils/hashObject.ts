import crypto from "crypto";
import { type JsonValue } from "type-fest";

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

export function hashRequest(projectId: string, reqPayload: JsonValue): string {
  const obj = {
    projectId,
    reqPayload,
  };
  return hashObject(obj);
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

function fastHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char; // Left shift and add the character code
    hash |= 0; // Convert to a 32-bit integer
  }
  return hash;
}

export function hashObjectFast(obj: object) {
  const str = JSON.stringify(obj);
  return fastHash(str);
}
