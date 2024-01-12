import { z } from "zod";

export function parseTags(tags: unknown): Record<string, string>;
export function parseTags(tags: unknown, keepNulls: true): Record<string, string | null>;
export function parseTags(tags: unknown, keepNulls?: true) {
  if (typeof tags !== "object") {
    throw new Error("Tags must be an object");
  }
  const parsedTags: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags as object)) {
    if (typeof value === "number" || typeof value === "boolean") {
      parsedTags[key] = String(value);
      continue;
    }
    if (value === "" || value === undefined || (value === null && !keepNulls)) {
      continue;
    }
    if (typeof value !== "string" && value !== null) {
      throw new Error(`Tag ${key} must be a string, number, boolean, or null`);
    }
    parsedTags[key] = value;
  }
  z.record(z.union([z.string(), z.null()])).parse(parsedTags);
  return parsedTags;
}
