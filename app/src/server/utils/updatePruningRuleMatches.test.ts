import { expect, it } from "vitest";
import { type Prisma } from "@prisma/client";
import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "~/server/db";
import { updatePruningRuleMatches } from "./updatePruningRuleMatches";

const input1: CreateChatCompletionRequestMessage[] = [
  {
    role: "system",
    content:
      "The user is testing multiple scenarios against the same prompt. Attempt to generate a new scenario that is different from the others.",
  },
  {
    role: "user",
    content:
      'Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *\n * You have access to the current scenario in the `scenario`\n * variable.\n */\n\ndefinePrompt("openai/ChatCompletion", {\n  model: "gpt-3.5-turbo-0613",\n  messages: [\n    {\n      role: "system",\n      content: `Write \'Start experimenting!\' in ${scenario.language}`,\n    },\n  ],\n});',
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

const createDatasetEntry = async (
  datasetId: string,
  input: CreateChatCompletionRequestMessage[],
) => {
  return await prisma.datasetEntry.create({
    data: {
      input: input as unknown as Prisma.InputJsonValue,
      output: {},
      inputTokens: 0,
      outputTokens: 0,
      datasetId,
      type: "TRAIN",
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

it("matches basic string", async () => {
  const datasetId = uuidv4();
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
  const datasetId = uuidv4();
  await createProject(datasetId);
  // Create experiments concurrently
  const [_, rule] = await Promise.all([
    createDatasetEntry(datasetId, input1),
    createPruningRule(
      datasetId,
      "Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *",
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
