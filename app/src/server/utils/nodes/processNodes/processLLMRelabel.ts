import type { ZodError } from "zod";
import type { DatasetEntryInput, Prisma } from "@prisma/client";
import pLimit from "p-limit";
import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import {
  LLMRelabelOutputs,
  RelabelOptions,
  typedDatasetEntryInput,
  typedNode,
} from "../node.types";
import { getOpenaiCompletion } from "../../openai";
import { countLlamaOutputTokens } from "~/utils/countTokens";
import { hashDatasetEntryOutput } from "../hashNode";
import { APIError } from "openai";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import dayjs from "~/utils/dayjs";
import { forwardNodeData } from "../forwardNodeData";

export const processLLMRelabel = async (nodeId: string) => {
  const startTime = Date.now();

  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
      include: {
        inputDataChannels: true,
        project: {
          include: {
            apiKeys: true,
          },
        },
      },
    })
    .then((n) => (n ? typedNode(n) : null));
  if (node?.type !== "LLMRelabel") return;
  const { relabelLLM, maxEntriesPerMinute, maxLLMConcurrency } = node.config;

  if (relabelLLM === RelabelOptions.SkipRelabel) {
    await kysely
      .updateTable("NodeData as nd")
      .where("nd.nodeId", "=", node.id)
      .where("nd.status", "=", "PENDING")
      .set({
        status: "PROCESSED",
      })
      .execute();
    await forwardNodeData({ nodeId, nodeOutputLabel: LLMRelabelOutputs.Relabeled });
  } else {
    // process all cached entries
    await kysely
      .updateTable("NodeData")
      .set({
        status: "PROCESSED",
        outputHash: sql`"cpnd"."outgoingDEOHash"`,
      })
      .from("CachedProcessedNodeData as cpnd")
      .where("NodeData.nodeId", "=", node.id)
      .where("NodeData.status", "=", "PENDING")
      .where("cpnd.nodeHash", "=", node.hash)
      .whereRef("NodeData.inputHash", "=", "cpnd.incomingDEIHash")
      .execute();

    const openaiApiKey = node.project.apiKeys.find((apiKey) => apiKey.provider === "OPENPIPE")
      ?.apiKey;

    if (!openaiApiKey) return;

    const entriesToProcess = await kysely
      .selectFrom("NodeData as nd")
      .where("nd.nodeId", "=", node.id)
      .where("nd.status", "=", "PENDING")
      .orderBy("nd.createdAt", "asc")
      .limit(maxEntriesPerMinute)
      .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
      .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.outputHash")
      .select([
        "nd.id as nodeDataId",
        "nd.originalOutputHash as originalOutputHash",
        "dei.hash as inputHash",
        "dei.tool_choice as tool_choice",
        "dei.tools as tools",
        "dei.messages as messages",
        "dei.response_format as response_format",
      ])
      .execute();

    // limit to max concurrency
    const limit = pLimit(maxLLMConcurrency);

    const tasks = entriesToProcess.map((entry) =>
      limit(() =>
        processEntry({
          projectId: node.projectId,
          nodeHash: node.hash,
          relabelLLM,
          entry,
        }),
      ),
    );

    await Promise.all(tasks);

    await forwardNodeData({ nodeId, nodeOutputLabel: LLMRelabelOutputs.Relabeled });
    await forwardNodeData({
      nodeId,
      nodeOutputLabel: LLMRelabelOutputs.Unprocessed,
      selectionExpression: llmRelabelUnprocessedSelectionExpression,
    });
  }

  // check if there are more entries to process
  const moreEntriesToProcess = await kysely
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", node.id)
    .where("nd.status", "=", "PENDING")
    .limit(1)
    .execute()
    .then((rows) => rows.length > 0);

  if (moreEntriesToProcess) {
    await processNode.enqueue(
      { nodeId, nodeType: "LLMRelabel" },
      { runAt: dayjs(startTime).add(1, "minute").toDate() },
    );
  }
};

const processEntry = async ({
  projectId,
  nodeHash,
  relabelLLM,
  entry,
}: {
  projectId: string;
  nodeHash: string;
  relabelLLM: RelabelOptions.GPT40613 | RelabelOptions.GPT41106 | RelabelOptions.GPT432k;
  entry: Pick<DatasetEntryInput, "tool_choice" | "tools" | "messages" | "response_format"> & {
    nodeDataId: string;
    inputHash: string;
    originalOutputHash: string;
  };
}) => {
  await prisma.nodeData.update({
    where: { id: entry.nodeDataId },
    data: { status: "PROCESSING", error: "" },
  });

  let typedEntry;
  try {
    typedEntry = typedDatasetEntryInput(entry);
  } catch (e) {
    await prisma.nodeData.update({
      where: { id: entry.nodeDataId },
      data: { status: "ERROR", error: (e as ZodError).message },
    });
    return;
  }
  const { tool_choice, tools, messages, response_format, originalOutputHash, inputHash } =
    typedEntry;

  try {
    const completion = await getOpenaiCompletion(projectId, {
      model: relabelLLM,
      messages,
      tool_choice: tool_choice ?? undefined,
      tools: tools ?? undefined,
      response_format: response_format ?? undefined,
    });

    const completionMessage = completion.choices[0]?.message;
    if (!completionMessage) throw new Error("No completion returned");
    const outputTokens = countLlamaOutputTokens(completionMessage);
    const outputHash = hashDatasetEntryOutput({
      projectId,
      output: completionMessage,
    });
    await prisma.datasetEntryOutput.createMany({
      data: [
        {
          hash: outputHash,
          output: completionMessage as unknown as Prisma.InputJsonValue,
          outputTokens,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.cachedProcessedNodeData.createMany({
      data: [
        {
          nodeHash,
          incomingDEIHash: inputHash,
          outgoingDEOHash: outputHash,
        },
      ],
      skipDuplicates: true,
    });

    const originalNodeData = await prisma.nodeData.findUniqueOrThrow({
      where: { id: typedEntry.nodeDataId },
    });

    await prisma.$transaction([
      // delete the original node data to remove all its children
      prisma.nodeData.delete({
        where: { id: originalNodeData.id },
      }),
      prisma.nodeData.create({
        data: {
          ...originalNodeData,
          status: "PROCESSED",
          outputHash,
          originalOutputHash,
        },
      }),
    ]);
  } catch (e) {
    if (e instanceof APIError && e.status === 429) {
      await prisma.nodeData.update({
        where: { id: typedEntry.nodeDataId },
        data: { status: "PENDING", error: (e as Error).message },
      });
    } else {
      await prisma.nodeData.update({
        where: { id: typedEntry.nodeDataId },
        data: { status: "ERROR", error: (e as Error).message },
      });
    }
  }
};

export const llmRelabelUnprocessedSelectionExpression = ({
  originNodeId,
  lastProcessedAt,
  destinationNodeId,
  channelId,
}: {
  originNodeId: string;
  lastProcessedAt: Date;
  destinationNodeId: string;
  channelId: string;
}) =>
  kysely
    .selectFrom("NodeData as nd")
    .where("nd.nodeId", "=", originNodeId)
    .where("nd.status", "!=", "PROCESSED")
    .where("nd.createdAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").toDate())
    .select((eb) => [
      "nd.importId as importId",
      eb.val(destinationNodeId).as("nodeId"),
      eb.val(channelId).as("dataChannelId"),
      "nd.id as parentNodeDataId",
      "nd.loggedCallId",
      "nd.inputHash",
      "nd.outputHash",
      "nd.originalOutputHash",
      "nd.split",
    ]);
