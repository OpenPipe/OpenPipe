/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type ChatCompletion, type ChatCompletionCreateParams } from "openai/resources/chat";

import { prisma } from "~/server/db";
import { type CompletionResponse } from "../types";
import { getCompletion2 } from "./getCompletion-2";

async function getCompletionForExperiments(
  input: ChatCompletionCreateParams,
  _onStream: ((partialOutput: ChatCompletion) => void) | null,
): Promise<CompletionResponse<ChatCompletion>> {
  try {
    const start = Date.now();
    const modelSlug = input.model.replace("openpipe:", "");
    const fineTune = await prisma.fineTune.findUnique({
      where: { slug: modelSlug },
    });
    if (!fineTune) {
      throw new Error("The model does not exist");
    }

    const completion = await getCompletion2(fineTune, input);

    return {
      type: "success",
      value: completion,
      timeToComplete: Date.now() - start,
      statusCode: 200,
    };
  } catch (e) {
    return {
      type: "error",
      message: (e as Error).message,
      autoRetry: false,
    };
  }
}

export default getCompletionForExperiments;
