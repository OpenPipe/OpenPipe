import { describe, expect, it } from "vitest";
import { type DatasetEntrySplit } from "@prisma/client";
import { type ChatCompletionMessageParam } from "openai/resources/chat";

import { kysely, prisma } from "~/server/db";
import { getStringsToPrune, pruneInputMessages } from "~/utils/pruningRules";
import {
  copyPruningRulesForFineTune,
  insertTrainingDataPruningRuleMatches,
  updateDatasetPruningRuleMatches,
} from "./updatePruningRuleMatches";
import { prepareIntegratedDatasetCreation } from "./nodeCreation/prepareIntegratedNodesCreation";
import {
  hashAndSaveDatasetEntryInput,
  hashAndSaveDatasetEntryOutput,
} from "~/server/utils/nodes/hashNode";

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

const initializeProject = async () => {
  const project = await prisma.project.create({
    data: {
      name: "test",
    },
  });

  const preparedIntegratedDatasetCreation = prepareIntegratedDatasetCreation({
    projectId: project.id,
    datasetName: "test",
  });

  await prisma.$transaction(preparedIntegratedDatasetCreation.prismaCreations);

  return {
    projectId: project.id,
    datasetId: preparedIntegratedDatasetCreation.datasetId,
    datasetNodeId: preparedIntegratedDatasetCreation.datasetNodeId,
    datasetNodeHash: preparedIntegratedDatasetCreation.datasetNodeHash,
    inputChannelId: preparedIntegratedDatasetCreation.manualRelabelDatasetInputChannelId,
  };
};

const createNodeEntry = async ({
  projectId,
  dataChannelId,
  messages,
  split = "TRAIN",
}: {
  projectId: string;
  dataChannelId: string;
  messages: ChatCompletionMessageParam[];
  split?: DatasetEntrySplit;
}) => {
  const inputHash = await hashAndSaveDatasetEntryInput({
    projectId,
    messages,
  });

  const outputHash = await hashAndSaveDatasetEntryOutput({
    projectId,
    output: {
      role: "assistant",
      content: "This is the output",
    },
  });

  return await prisma.nodeEntry.create({
    data: {
      dataChannelId,
      persistentId: "_",
      inputHash,
      originalOutputHash: outputHash,
      outputHash,
      split,
      status: "PROCESSED",
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

const createFineTuneTrainingEntry = async ({
  fineTuneId,
  nodeEntryPersistentId,
  inputHash,
  outputHash,
}: {
  fineTuneId: string;
  nodeEntryPersistentId: string;
  inputHash: string;
  outputHash: string;
}) => {
  return await prisma.fineTuneTrainingEntry.create({
    data: {
      fineTuneId,
      nodeEntryPersistentId,
      inputHash,
      outputHash,
    },
  });
};

it("matches basic string", async () => {
  const creationParams = await initializeProject();
  // Create experiments concurrently
  const [_, rule] = await Promise.all([
    createNodeEntry({
      projectId: creationParams.projectId,
      dataChannelId: creationParams.inputChannelId,
      messages: input1,
    }),
    createPruningRule(
      creationParams.datasetId,
      "The user is testing multiple scenarios against the same prompt",
    ),
  ]);

  await updateDatasetPruningRuleMatches({
    nodeHash: creationParams.datasetNodeHash,
    datasetId: creationParams.datasetId,
    nodeEntryBaseQuery: kysely
      .selectFrom("NodeEntry as ne")
      .innerJoin("DataChannel as dc", (join) =>
        join
          .onRef("dc.id", "=", "ne.dataChannelId")
          .on("dc.destinationId", "=", creationParams.datasetNodeId),
      )
      .where("ne.status", "=", "PROCESSED"),
    pruningRuleCutoffDate: new Date(0),
  });

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
  const creationParams = await initializeProject();

  // Create experiments concurrently
  const [_, rule] = await Promise.all([
    createNodeEntry({
      projectId: creationParams.projectId,
      dataChannelId: creationParams.inputChannelId,
      messages: input1,
    }),
    createPruningRule(
      creationParams.datasetId,
      "This is the user message.\nIt has a newline.\n\nAnd another two. ",
    ),
  ]);

  await updateDatasetPruningRuleMatches({
    nodeHash: creationParams.datasetNodeHash,
    datasetId: creationParams.datasetId,
    nodeEntryBaseQuery: kysely
      .selectFrom("NodeEntry as ne")
      .innerJoin("DataChannel as dc", (join) =>
        join
          .onRef("dc.id", "=", "ne.dataChannelId")
          .on("dc.destinationId", "=", creationParams.datasetNodeId),
      )
      .where("ne.status", "=", "PROCESSED"),
    pruningRuleCutoffDate: new Date(0),
  });

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
    const creationParams = await initializeProject();

    const [nodeEntry, rule] = await Promise.all([
      createNodeEntry({
        projectId: creationParams.projectId,
        dataChannelId: creationParams.inputChannelId,
        messages: input1,
      }),
      createPruningRule(
        creationParams.datasetId,
        "The user is testing multiple scenarios against the same prompt",
      ),
    ]);

    await updateDatasetPruningRuleMatches({
      nodeHash: creationParams.datasetNodeHash,
      datasetId: creationParams.datasetId,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join
            .onRef("dc.id", "=", "ne.dataChannelId")
            .on("dc.destinationId", "=", creationParams.datasetNodeId),
        )
        .where("ne.status", "=", "PROCESSED"),
      pruningRuleCutoffDate: new Date(0),
    });

    const fineTune = await createFineTune(creationParams.projectId, creationParams.datasetId);

    await copyPruningRulesForFineTune(fineTune.id, [rule.id]);

    expect(
      await prisma.pruningRule.count({
        where: {
          fineTuneId: fineTune.id,
        },
      }),
    ).toBe(1);

    await createFineTuneTrainingEntry({
      fineTuneId: fineTune.id,
      nodeEntryPersistentId: "_",
      inputHash: nodeEntry.inputHash,
      outputHash: nodeEntry.outputHash,
    });

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
    const creationParams = await initializeProject();

    const [nodeEntry, rule] = await Promise.all([
      createNodeEntry({
        projectId: creationParams.projectId,
        dataChannelId: creationParams.inputChannelId,
        messages: input1,
      }),
      createPruningRule(
        creationParams.datasetId,
        "The user is testing multiple scenarios against the same prompt",
      ),
    ]);

    await updateDatasetPruningRuleMatches({
      nodeHash: creationParams.datasetNodeHash,
      datasetId: creationParams.datasetId,
      nodeEntryBaseQuery: kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join
            .onRef("dc.id", "=", "ne.dataChannelId")
            .on("dc.destinationId", "=", creationParams.datasetNodeId),
        )
        .where("ne.status", "=", "PROCESSED"),
      pruningRuleCutoffDate: new Date(0),
    });

    const fineTune = await createFineTune(creationParams.projectId, creationParams.datasetId);

    await copyPruningRulesForFineTune(fineTune.id, [rule.id]);

    await createFineTuneTrainingEntry({
      fineTuneId: fineTune.id,
      nodeEntryPersistentId: "_",
      inputHash: nodeEntry.inputHash,
      outputHash: nodeEntry.outputHash,
    });

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
