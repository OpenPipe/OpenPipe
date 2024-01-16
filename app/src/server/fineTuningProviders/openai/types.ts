import { z } from "zod";

export const supportedModels = z.enum(["gpt-3.5-turbo-0613", "gpt-3.5-turbo-1106"]);
