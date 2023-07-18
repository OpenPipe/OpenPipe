import { OpenAIChatModel, type SupportedModel } from "../types";
import openAIChatApiShape from "~/codegen/openai.types.ts.txt";

export const getApiShapeForModel = (model: SupportedModel) => {
  if (model in OpenAIChatModel) return openAIChatApiShape;
  return "";
};
