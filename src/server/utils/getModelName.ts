import { isObject } from "lodash";
import { type JSONSerializable, type SupportedModel } from "../types";
import { type Prisma } from "@prisma/client";

export function getModelName(config: JSONSerializable | Prisma.JsonValue): SupportedModel | null {
  if (!isObject(config)) return null;
  if ("model" in config && typeof config.model === "string") return config.model as SupportedModel;
  return null;
}
