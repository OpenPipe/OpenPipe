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
import { evaluateTestSetEntry } from "~/server/tasks/evaluateTestSetEntry.task";

const setGlobal = (key: string, value: any) => {
  (global as any)[key] = value;
};

setGlobal("prisma", prisma);

setGlobal("startTestJobs", startTestJobs);

const fineTune = await prisma.fineTune.findUniqueOrThrow({
  where: { id: "fa64d94e-dbfd-4d68-8a8c-d55ec8994b54" },
});

await startTestJobs(fineTune);

// const outputs = await prisma.fineTuneTestingEntry.findMany({
//   where: { fineTuneId: fineTune.id, output: { not: Prisma.AnyNull }, score: null },
//   include: { datasetEntry: true },
// });

// outputs = outputs.filter(
//   (output) => output.datasetEntry.function_call["name"] === "extract_credit_card_fields",
// );

// await getTestResult.runNow({
//   fineTuneId: "c0609507-d261-4200-a376-5acded45c4bd",
//   datasetEntryId: "9a729774-cd19-439f-8d71-58b9aef80a14",
//   skipCache: false,
// });
// average over all outputs

// for (const output of outputs) {
//   const score = calculateEntryScore(output.datasetEntry?.output, output.output);
//   console.log("score", score, output.score);
// }
// const averageScore =
//   outputs.map((output) => output.score ?? 0).reduce((a, b) => a + b, 0) / outputs.length;

// console.log("found outputs", outputs.length);
// console.log("score", averageScore);
