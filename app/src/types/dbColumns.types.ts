import type {
  DatasetEntryInput,
  DatasetEntryOutput,
  FineTune,
  Invoice,
  LoggedCall,
} from "@prisma/client";
import { z } from "zod";

import { baseModel } from "~/server/fineTuningProviders/types";
import {
  chatCompletionInput,
  chatCompletionInputReqPayload,
  chatCompletionMessage,
  chatCompletionOutput,
} from "./shared.types";
import { axolotlConfig } from "~/server/fineTuningProviders/openpipe/axolotlConfig";

export const chatInputs = chatCompletionInputReqPayload.shape;

const datasetEntryInput = z
  .object({
    messages: chatInputs.messages,
    tool_choice: chatInputs.tool_choice.optional().nullable(),
    tools: chatInputs.tools.optional().nullable(),
    response_format: chatInputs.response_format.optional().nullable(),
  })
  .passthrough();

export const typedDatasetEntryInput = <T extends Pick<DatasetEntryInput, "messages">>(
  input: T,
): Omit<T, "messages"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryInput> => datasetEntryInput.parse(input);

const datasetEntryOutput = z
  .object({
    output: chatCompletionMessage,
  })
  .passthrough();

export const typedDatasetEntryOutput = <T extends Pick<DatasetEntryOutput, "output">>(
  input: T,
): Omit<T, "output"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryOutput> => datasetEntryOutput.parse(input);

const nodeEntry = z.intersection(datasetEntryInput.passthrough(), datasetEntryOutput.passthrough());

export const typedNodeEntry = <
  T extends Pick<DatasetEntryInput, "messages"> & Pick<DatasetEntryOutput, "output">,
>(
  input: T,
): Omit<T, "messages" | "output"> & z.infer<typeof nodeEntry> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  nodeEntry.parse(input);

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
