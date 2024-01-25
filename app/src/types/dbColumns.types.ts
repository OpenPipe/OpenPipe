import type { DatasetEntry, FineTune, Invoice, LoggedCall } from "@prisma/client";
import { z } from "zod";

import { baseModel } from "~/server/fineTuningProviders/types";
import {
  chatCompletionInput,
  chatCompletionInputReqPayload,
  chatCompletionMessage,
  chatCompletionOutput,
} from "./shared.types";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";

const chatInputs = chatCompletionInputReqPayload.shape;

export const datasetEntrySchema = z
  .object({
    messages: chatInputs.messages,
    function_call: chatInputs.function_call.nullable(),
    functions: chatInputs.functions.nullable(),
    tool_choice: chatInputs.tool_choice.nullable(),
    tools: chatInputs.tools.nullable(),
    response_format: chatInputs.response_format.nullable(),
    output: chatCompletionMessage.optional().nullable(),
  })
  .passthrough();

export const typedDatasetEntry = <T extends Pick<DatasetEntry, "messages">>(
  input: T,
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
): Omit<T, "messages"> & z.infer<typeof datasetEntrySchema> => datasetEntrySchema.parse(input);

const loggedCall = z
  .object({
    reqPayload: chatCompletionInput,
    respPayload: chatCompletionOutput.passthrough().optional().nullable(),
  })
  .passthrough();

export const typedLoggedCall = <T extends Pick<LoggedCall, "reqPayload">>(
  input: T,
): Omit<T, "reqPayload" | "respPayload"> & z.infer<typeof loggedCall> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  loggedCall.parse(input);

const fineTuneTestingEntrySchema = z
  .object({
    output: chatCompletionMessage.optional(),
  })
  .passthrough();

export const typedFineTuneTestingEntry = <T>(
  input: T,
): T & z.infer<typeof fineTuneTestingEntrySchema> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  fineTuneTestingEntrySchema.parse(input);

const fineTuneSchema = z.intersection(
  baseModel,
  z
    .object({
      pipelineVersion: z
        .union([
          // Old RunPod-based pipeline. Not supported.
          z.literal(0),

          // moved to Modal
          z.literal(1),

          // Added support for function calls
          z.literal(2),

          // LoRA serving enabled
          z.literal(3),
        ])
        .optional(),
      trainingConfig: axolotlConfig.optional().nullable(),
      trainingConfigOverrides: axolotlConfig.partial().optional().nullable(),
    })
    .passthrough(),
);

// TODO: fix the passThroughNulls type from utils.ts to work with generics and
// wrap this with that for better ergonomics.
export function typedFineTune<T extends Pick<FineTune, "baseModel" | "provider">>(
  input: T,
): Omit<T, "baseModel" | "provider" | "trainingConfig" | "trainingConfigOverrides"> &
  z.infer<typeof fineTuneSchema> {
  return fineTuneSchema.parse(input);
}

export type TypedFineTune = ReturnType<typeof typedFineTune<FineTune>>;

export const ORIGINAL_MODEL_ID = "original";

const invoiceSchema = z
  .object({
    description: z.array(z.record(z.string())),
  })
  .passthrough();

export const typedInvoice = <T extends Pick<Invoice, "description">>(
  input: T,
): Omit<T, "description"> & z.infer<typeof invoiceSchema> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  invoiceSchema.parse(input);
