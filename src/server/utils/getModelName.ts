import { isObject } from "lodash";
import { type JSONSerializable, type SupportedModel } from "../types";

export function getModelName(config: JSONSerializable): SupportedModel | null {
  if (!isObject(config)) return null;
  if ("model" in config && typeof config.model === "string") return config.model as SupportedModel;
  return null
}
