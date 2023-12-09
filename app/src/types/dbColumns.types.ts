import type { LoggedCall, DatasetEntry } from "@prisma/client";
import { z } from "zod";

import {
  chatCompletionInput,
  chatCompletionInputReqPayload,
  chatCompletionMessage,
  chatCompletionOutput,
} from "./shared.types";

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

export const ORIGINAL_MODEL_ID = "original";
