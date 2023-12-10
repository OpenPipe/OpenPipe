import { z } from "zod";
import { supportedModels as openpipeModels } from "./openpipe/types";
import { supportedModels as openaiModels } from "./openai/types";

export const baseModel = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("openai"), baseModel: openaiModels }).passthrough(),
  z.object({ provider: z.literal("openpipe"), baseModel: openpipeModels }).passthrough(),
]);

export type BaseModel = z.infer<typeof baseModel>;
