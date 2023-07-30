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

export default function hashSortedObject(prompt: JsonValue): string {
  // Sort object keys recursively
  const sortedObj = sortKeys(prompt as unknown as JsonValue);

  // Convert to JSON and hash it
  const str = JSON.stringify(sortedObj);
  return hashString(str);
}

export function hashString(str: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}
