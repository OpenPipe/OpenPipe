import { z } from "zod";

export const parseTags = (tags: unknown) => {
  if (typeof tags !== "object") {
    throw new Error("Tags must be an object");
  }
  const parsedTags: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags as object)) {
    if (typeof value === "number" || typeof value === "boolean") {
      parsedTags[key] = String(value);
      continue;
    }
    if (!value) {
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(`Tag ${key} must be a string`);
    }
    parsedTags[key] = value;
  }
  z.record(z.string()).parse(parsedTags);
  return parsedTags;
};
