import { type TypedFineTune } from "~/types/dbColumns.types";

export const fireworksConfig = (fineTune: TypedFineTune) => {
  const model = fineTune.baseModel;

  if (model === "mistralai/Mixtral-8x7B-Instruct-v0.1") {
    return {
      baseModel: "accounts/fireworks/models/mixtral-8x7b-instruct-hf",
    };
  } else if (model === "mistralai/Mistral-7B-Instruct-v0.2") {
    // throw new Error("TODO figure out the baseModel");
    return {
      baseModel: "accounts/fireworks/models/mistral-7b-instruct-v0p2",
    };
  }
  return null;
};
