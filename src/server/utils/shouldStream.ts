import { isObject } from "lodash-es";
import { type JSONSerializable } from "../types";

export const shouldStream = (config: JSONSerializable): boolean => {
  const shouldStream = isObject(config) && "stream" in config && config.stream === true;
  return shouldStream;
};
