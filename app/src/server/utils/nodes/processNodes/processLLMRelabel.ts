import type { ZodError } from "zod";
import type { DatasetEntryInput } from "@prisma/client";
import pLimit from "p-limit";
import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { LLMRelabelOutput, RelabelOption, typedDatasetEntryInput, typedNode } from "../node.types";
import { getOpenaiCompletion } from "../../openai";
import { hashAndSaveDatasetEntryOutput } from "../hashNode";
import { APIError } from "openai";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNode.task";
import dayjs from "~/utils/dayjs";
import { forwardNodeEntries } from "../forwardNodeEntries";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";

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

  if (relabelLLM === RelabelOption.SkipRelabel) {
    await kysely
      .updateTable("NodeEntry as ne")
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PENDING")
      .set({
        status: "PROCESSED",
      })
      .execute();
    await forwardNodeEntries({ nodeId, nodeOutputLabel: LLMRelabelOutput.Relabeled });
  } else {
    // process all cached entries
    await kysely
      .updateTable("NodeEntry")
      .set({
        status: "PROCESSED",
        outputHash: sql`"cpne"."outgoingDEOHash"`,
      })
      .from("CachedProcessedNodeEntry as cpne")
      .where("NodeEntry.nodeId", "=", node.id)
      .where("NodeEntry.status", "=", "PENDING")
      .where("cpne.nodeHash", "=", node.hash)
      .whereRef("NodeEntry.inputHash", "=", "cpne.incomingDEIHash")
      .execute();

    const openaiApiKey = node.project.apiKeys.find((apiKey) => apiKey.provider === "OPENPIPE")
      ?.apiKey;

    if (!openaiApiKey) return;

    const entriesToProcess = await kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.nodeId", "=", node.id)
      .where("ne.status", "=", "PENDING")
      .orderBy("ne.createdAt", "asc")
      .limit(maxEntriesPerMinute)
      .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
      .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
      .select([
        "ne.id as nodeEntryId",
        "ne.originalOutputHash as originalOutputHash",
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

    await forwardNodeEntries({ nodeId, nodeOutputLabel: LLMRelabelOutput.Relabeled });
    await forwardNodeEntries({
      nodeId,
      nodeOutputLabel: LLMRelabelOutput.Unprocessed,
      selectionExpression: llmRelabelUnprocessedSelectionExpression,
    });
  }

  // check if there are more entries to process
  const moreEntriesToProcess = await kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", node.id)
    .where("ne.status", "=", "PENDING")
    .limit(1)
    .execute()
    .then((rows) => rows.length > 0);

  if (moreEntriesToProcess) {
    await enqueueProcessNode(
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
  relabelLLM: RelabelOption.GPT351106 | RelabelOption.GPT41106 | RelabelOption.GPT40613;
  entry: Pick<DatasetEntryInput, "tool_choice" | "tools" | "messages" | "response_format"> & {
    nodeEntryId: string;
    inputHash: string;
    originalOutputHash: string;
  };
}) => {
  await prisma.nodeEntry.update({
    where: { id: entry.nodeEntryId },
    data: { status: "PROCESSING", error: "" },
  });

  let typedEntry;
  try {
    typedEntry = typedDatasetEntryInput(entry);
  } catch (e) {
    await prisma.nodeEntry.update({
      where: { id: entry.nodeEntryId },
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

    const outputHash = await hashAndSaveDatasetEntryOutput({
      projectId,
      output: completionMessage,
    });

    await prisma.cachedProcessedNodeEntry.createMany({
      data: [
        {
          nodeHash,
          incomingDEIHash: inputHash,
          outgoingDEOHash: outputHash,
        },
      ],
      skipDuplicates: true,
    });

    const originalNodeEntry = await prisma.nodeEntry.findUniqueOrThrow({
      where: { id: typedEntry.nodeEntryId },
    });

    await prisma.$transaction([
      // delete the original node data to remove all its children
      prisma.nodeEntry.delete({
        where: { id: originalNodeEntry.id },
      }),
      prisma.nodeEntry.create({
        data: {
          ...originalNodeEntry,
          status: "PROCESSED",
          outputHash,
          originalOutputHash,
        },
      }),
    ]);

    await countDatasetEntryTokens.enqueue();
  } catch (e) {
    if (e instanceof APIError && e.status === 429) {
      await prisma.nodeEntry.update({
        where: { id: typedEntry.nodeEntryId },
        data: { status: "PENDING", error: (e as Error).message },
      });
    } else {
      await prisma.nodeEntry.update({
        where: { id: typedEntry.nodeEntryId },
        data: { status: "ERROR", error: (e as Error).message },
      });
    }
  }
};

export const llmRelabelUnprocessedSelectionExpression = ({
  originNodeId,
  lastProcessedAt,
}: {
  originNodeId: string;
  lastProcessedAt: Date;
}) =>
  kysely
    .selectFrom("NodeEntry as ne")
    .where("ne.nodeId", "=", originNodeId)
    .where("ne.status", "!=", "PROCESSED")
    .where("ne.createdAt", ">=", dayjs(lastProcessedAt).subtract(10, "seconds").toDate())
    .select(["ne.split", "ne.inputHash", "ne.outputHash"]);
