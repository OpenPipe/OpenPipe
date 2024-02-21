import type { ZodError } from "zod";
import { NodeEntryStatus, type DatasetEntryInput } from "@prisma/client";
import pLimit from "p-limit";
import { sql } from "kysely";
import { APIError } from "openai";

import { kysely, prisma } from "~/server/db";
import {
  LLMRelabelOutput,
  RelabelOption,
  typedDatasetEntryInput,
  typedNode,
} from "~/server/utils/nodes/node.types";
import { getOpenaiCompletion } from "~/server/utils/openai";
import { hashAndSaveDatasetEntryOutput } from "~/server/utils/nodes/hashNode";
import {
  type NodeProperties,
  enqueueProcessNode,
} from "~/server/tasks/nodes/processNodes/processNode.task";
import dayjs from "~/utils/dayjs";
import { forwardNodeEntries } from "./forwardNodeEntries";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";

export const llmRelabelProperties: NodeProperties = {
  cacheMatchFields: ["incomingDEIHash"],
  cacheWriteFields: ["outgoingDEOHash"],
  readBatchSize: 50,
  beforeAll: async (node) => {
    if (node.type !== "LLMRelabel") throw new Error("Node type is not LLMRelabel");
    if (node.config.relabelLLM === RelabelOption.SkipRelabel) {
      await prisma.nodeEntry.updateMany({
        where: { nodeId: node.id, status: "PENDING" },
        data: { status: "PROCESSED" },
      });
    }
  },
  getConcurrency: (node) => {
    if (node.type !== "LLMRelabel") throw new Error("Node type is not LLMRelabel");
    return node.config.maxLLMConcurrency;
  },
  processEntry: async ({ node, entry }) => {
    if (node.type !== "LLMRelabel") throw new Error("Node type is not LLMRelabel");

    const { tool_choice, tools, messages, response_format } = entry;

    try {
      let completionMessage;
      if (node.config.relabelLLM === RelabelOption.SkipRelabel) {
        completionMessage = entry.output;
      } else {
        const completion = await getOpenaiCompletion(node.projectId, {
          model: node.config.relabelLLM,
          messages,
          tool_choice: tool_choice ?? undefined,
          tools: tools ?? undefined,
          response_format: response_format ?? undefined,
        });

        completionMessage = completion.choices[0]?.message;
        if (!completionMessage) throw new Error("No completion returned");
      }

      return {
        nodeEntryId: entry.id,
        status: NodeEntryStatus.PROCESSED,
        output: completionMessage,
        incomingDEIHash: entry.inputHash,
      } as const;
    } catch (e) {
      if (e instanceof APIError && e.status === 429) {
        await prisma.nodeEntry.update({
          where: { id: entry.id },
          data: { status: NodeEntryStatus.PENDING, error: (e as Error).message },
        });
        return {
          nodeEntryId: entry.id,
          status: NodeEntryStatus.PENDING,
          error: (e as Error).message ?? "Rate limited",
        } as const;
      } else {
        await prisma.nodeEntry.update({
          where: { id: entry.id },
          data: { status: NodeEntryStatus.ERROR, error: (e as Error).message },
        });
        return {
          nodeEntryId: entry.id,
          status: NodeEntryStatus.ERROR,
          error: (e as Error).message ?? "Unknown error",
        } as const;
      }
    }
  },
  outputs: [{ label: LLMRelabelOutput.Relabeled }],
};

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
  const { relabelLLM, maxLLMConcurrency } = node.config;

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
      .from("CachedProcessedEntry as cpne")
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
      .limit(100)
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
        prevProcessEntry({
          projectId: node.projectId,
          nodeHash: node.hash,
          relabelLLM,
          entry,
        }),
      ),
    );

    await Promise.all(tasks);

    await forwardNodeEntries({ nodeId, nodeOutputLabel: LLMRelabelOutput.Relabeled });
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

const prevProcessEntry = async ({
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

    await prisma.cachedProcessedEntry.createMany({
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

    await countDatasetEntryTokens.enqueue({});
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
