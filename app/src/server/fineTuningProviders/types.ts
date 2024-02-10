import { z } from "zod";
import { supportedModels as openpipeModels } from "./openpipe/supportedModels";
import { supportedModels as openaiModels } from "./openai/types";

export const baseModel = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("openai"), baseModel: openaiModels }),
  z.object({ provider: z.literal("openpipe"), baseModel: openpipeModels }),
]);

export type BaseModel = z.infer<typeof baseModel>;

// Gives us a type of eg "openai:gpt-3.5-turbo-1106" | "openpipe:OpenPipe/meta-llama/Llama-2-7b-hf"
export type ProviderWithModel = BaseModel extends infer T
  ? T extends { provider: infer P; model: infer M }
    ? P extends string
      ? M extends string
        ? `${P}:${M}`
        : never
      : never
    : T extends { provider: infer P; baseModel: infer BM }
    ? P extends string
      ? BM extends string
        ? `${P}:${BM}`
        : never
      : never
    : never
  : never;
