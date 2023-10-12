// disable eslint for this entire file
/* eslint-disable unused-imports/no-unused-imports */

import "dotenv/config";
import { prisma } from "../src/server/db";
import { startTestJobs } from "~/server/utils/startTestJobs";
import { Prisma } from "@prisma/client";
import { ChatCompletionCreateParams, ChatCompletionMessage } from "openai/resources/chat";
import { calculateEntryScore } from "~/server/utils/calculateEntryScore";
import { getCompletion2 } from "~/modelProviders/fine-tuned/getCompletion-2";
import { pick } from "lodash-es";

const setGlobal = (key: string, value: any) => {
  (global as any)[key] = value;
};

// This is better
setGlobal("prisma", prisma);

setGlobal("startTestJobs", startTestJobs);

const fineTune = await prisma.fineTune.findUniqueOrThrow({
  where: { id: "1a978438-5378-40ab-ba94-9a17a01732b0" },
});

const outputs = await prisma.fineTuneTestingEntry.findMany({
  where: { fineTuneId: fineTune.id, output: { not: Prisma.AnyNull }, score: null },
  include: { datasetEntry: true },
});

// outputs = outputs.filter(
//   (output) => output.datasetEntry.function_call["name"] === "extract_credit_card_fields",
// );

console.log(outputs[0]?.datasetEntry.output);
// average over all outputs

// for (const output of outputs) {
//   const score = calculateEntryScore(output.datasetEntry?.output, output.output);
//   console.log("score", score, output.score);
// }
// const averageScore =
//   outputs.map((output) => output.score ?? 0).reduce((a, b) => a + b, 0) / outputs.length;

// console.log("found outputs", outputs.length);
// console.log("score", averageScore);
