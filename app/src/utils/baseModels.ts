import { type BaseModel } from "@prisma/client";

export const SUPPORTED_BASE_MODELS = [
  "LLAMA2_7b",
  "LLAMA2_13b",
  "LLAMA2_70b",
  "GPT_3_5_TURBO",
] as const;

export const displayBaseModel = (baseModel: BaseModel) => {
  switch (baseModel) {
    case "LLAMA2_7b":
      return "llama2-7b";
    case "LLAMA2_13b":
      return "llama2-13b";
    case "LLAMA2_70b":
      return "llama2-70b";
    case "GPT_3_5_TURBO":
      return "gpt3-5-turbo";
  }
};
