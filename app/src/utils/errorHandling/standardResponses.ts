import { z, type ZodTypeAny } from "zod";

export function error(message: string): { status: "error"; message: string } {
  return {
    status: "error",
    message,
  };
}
export function success<T>(payload: T): { status: "success"; payload: T };
export function success(payload?: undefined): { status: "success"; payload: undefined };
export function success<T>(payload?: T) {
  return { status: "success", payload };
}

export function standardResponseShape<T extends ZodTypeAny>(payloadShape = z.undefined() as T) {
  return z.union([
    z.object({
      status: z.literal("success"),
      payload: payloadShape,
    }),
    z.object({
      status: z.literal("error"),
      message: z.string(),
    }),
  ]);
}
