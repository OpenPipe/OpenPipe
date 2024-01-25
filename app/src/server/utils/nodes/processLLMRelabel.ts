import type { ZodError } from "zod";
import type { DatasetEntryInput, Prisma } from "@prisma/client";
import pLimit from "p-limit";

import { kysely, prisma } from "~/server/db";
import { LLMRelabelOutputs, RelabelOptions, typedDatasetEntryInput, typedNode } from "./node.types";
import { getOpenaiCompletion } from "../openai";
import { countLlamaOutputTokens } from "~/utils/countTokens";
import { hashDatasetEntryOutput } from "./hashNode";
import { APIError } from "openai";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import dayjs from "~/utils/dayjs";
import { forwardNodeData, llmRelabelUnprocessedSelectionExpression } from "./forwardNodeData";

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
  const { relabelLLM } = node.config;

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
    const openaiApiKey = node.project.apiKeys.find((apiKey) => apiKey.provider === "OPENPIPE")
      ?.apiKey;

    if (!openaiApiKey) return;
    const { maxEntriesPerMinute, maxLLMConcurrency } = node.config;

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
        "dei.tool_choice as tool_choice",
        "dei.tools as tools",
        "dei.messages as messages",
        "dei.response_format as response_format",
        "deo.hash as rejectedOutputHash",
      ])
      .execute();

    // limit to max concurrency
    const limit = pLimit(maxLLMConcurrency);

    const tasks = entriesToProcess.map((entry) =>
      limit(() =>
        processEntry({
          projectId: node.projectId,
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
  relabelLLM,
  entry,
}: {
  projectId: string;
  relabelLLM: RelabelOptions.GPT40613 | RelabelOptions.GPT41106 | RelabelOptions.GPT432k;
  entry: Pick<DatasetEntryInput, "tool_choice" | "tools" | "messages" | "response_format"> & {
    nodeDataId: string;
    rejectedOutputHash: string;
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
  const { tool_choice, tools, messages, response_format, rejectedOutputHash } = typedEntry;

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
          rejectedOutputHash,
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
