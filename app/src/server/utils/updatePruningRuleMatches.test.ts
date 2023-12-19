import { describe, expect, it } from "vitest";
import { type DatasetEntrySplit, type Prisma } from "@prisma/client";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "~/server/db";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import {
  copyPruningRulesForFineTune,
  insertTrainingDataPruningRuleMatches,
  updatePruningRuleMatches,
} from "./updatePruningRuleMatches";

const input1: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "The user is testing multiple scenarios against the same prompt. Attempt to generate a new scenario that is different from the others.",
  },
  {
    role: "user",
    content:
      "This is the user message.\nIt has a newline.\n\nAnd another two. Then it has text without newlines.",
  },
  {
    role: "assistant",
    content: null,
    function_call: { name: "add_scenario", arguments: '{"language":"English"}' },
  },
  {
    role: "assistant",
    content: null,
    function_call: { name: "add_scenario", arguments: '{"language":"Spanish"}' },
  },
  {
    role: "assistant",
    content: null,
    function_call: { name: "add_scenario", arguments: '{"language":"German"}' },
  },
];

const createProject = async (datasetId: string) => {
  return await prisma.project.create({
    data: {
      id: uuidv4(),
      name: "test",
      datasets: {
        create: [
          {
            id: datasetId,
            name: "test",
          },
        ],
      },
    },
  });
};

const datasetId = uuidv4();

const createDatasetEntry = async (
  datasetId: string,
  messages: ChatCompletionMessageParam[],
  split: DatasetEntrySplit = "TRAIN",
) => {
  return await prisma.datasetEntry.create({
    data: {
      messages: messages as unknown as Prisma.InputJsonValue,
      output: {},
      inputTokens: 0,
      outputTokens: 0,
      datasetId,
      split,
      sortKey: "_",
      importId: "_",
      provenance: "UPLOAD",
    },
  });
};

const createPruningRule = async (datasetId: string, textToMatch: string) => {
  return await prisma.pruningRule.create({
    data: {
      datasetId,
      textToMatch,
      tokensInText: 0,
    },
  });
};

const createFineTune = async (projectId: string, datasetId: string) => {
  return await prisma.fineTune.create({
    data: {
      slug: "test",
      baseModel: "OpenPipe/mistral-7b-1212",
      projectId,
      datasetId,
      provider: "openai",
      pipelineVersion: 2,
    },
  });
};

const createFineTuneTrainingEntry = async (fineTuneId: string, datasetEntryId: string) => {
  return await prisma.fineTuneTrainingEntry.create({
    data: {
      fineTuneId,
      datasetEntryId,
    },
  });
};

it("matches basic string", async () => {
  await createProject(datasetId);
  // Create experiments concurrently
  const [_, rule] = await Promise.all([
    createDatasetEntry(datasetId, input1),
    createPruningRule(datasetId, "The user is testing multiple scenarios against the same prompt"),
  ]);

  await updatePruningRuleMatches(datasetId, new Date(0));

  // Make sure there are a total of 4 scenarios for exp2
  expect(
    await prisma.pruningRuleMatch.count({
      where: {
        pruningRuleId: rule.id,
      },
    }),
  ).toBe(1);
});

it("matches string with newline", async () => {
  await createProject(datasetId);
  // Create experiments concurrently
  const [_, rule] = await Promise.all([
    createDatasetEntry(datasetId, input1),
    createPruningRule(
      datasetId,
      "This is the user message.\nIt has a newline.\n\nAnd another two. ",
    ),
  ]);

  await updatePruningRuleMatches(datasetId, new Date(0));

  // Make sure there are a total of 4 scenarios for exp2
  expect(
    await prisma.pruningRuleMatch.count({
      where: {
        pruningRuleId: rule.id,
      },
    }),
  ).toBe(1);
});

describe("fine tune pruning rules", () => {
  it("matches basic string", async () => {
    const project = await createProject(datasetId);

    const [datasetEntry, rule] = await Promise.all([
      createDatasetEntry(datasetId, input1),
      createPruningRule(
        datasetId,
        "The user is testing multiple scenarios against the same prompt",
      ),
    ]);

    await updatePruningRuleMatches(datasetId, new Date(0));

    const fineTune = await createFineTune(project.id, datasetId);

    await copyPruningRulesForFineTune(fineTune.id, [rule.id]);

    expect(
      await prisma.pruningRule.count({
        where: {
          fineTuneId: fineTune.id,
        },
      }),
    ).toBe(1);

    await createFineTuneTrainingEntry(fineTune.id, datasetEntry.id);

    await insertTrainingDataPruningRuleMatches(fineTune.id);

    // Make sure there are a total of 4 scenarios for exp2
    expect(
      await prisma.pruningRuleMatch.count({
        where: {
          pruningRule: {
            fineTuneId: fineTune.id,
          },
        },
      }),
    ).toBe(1);
  });

  it("properly prunes input", async () => {
    const project = await createProject(datasetId);

    const [datasetEntry, rule] = await Promise.all([
      createDatasetEntry(datasetId, input1),
      createPruningRule(
        datasetId,
        "The user is testing multiple scenarios against the same prompt",
      ),
    ]);

    await updatePruningRuleMatches(datasetId, new Date(0));

    const fineTune = await createFineTune(project.id, datasetId);

    await copyPruningRulesForFineTune(fineTune.id, [rule.id]);

    await createFineTuneTrainingEntry(fineTune.id, datasetEntry.id);

    await insertTrainingDataPruningRuleMatches(fineTune.id);

    const stringsToPrune = await getStringsToPrune(fineTune.id);

    expect(stringsToPrune).toEqual([
      "The user is testing multiple scenarios against the same prompt",
    ]);

    const prunedMessages = pruneInputMessages(input1, stringsToPrune);

    const manuallyPrunedContent = (input1[0]?.content as string).replace("The user is testing", "");
    expect(prunedMessages[0]?.content).toEqual(manuallyPrunedContent);
  });
});
