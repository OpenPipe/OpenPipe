import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import dayjs from "~/utils/dayjs";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { validateRowToImport } from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import { truthyFilter } from "~/utils/utils";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { generatePersistentId } from "~/server/utils/nodes/utils";
import { type NodeProperties } from "./nodeProperties.types";
import { monitorNodeSchema } from "../node.types";
import { checkNodeInput } from "../checkNodeInput";

export enum MonitorOutput {
  MatchedLogs = "Matched Logs",
}

export const monitorProperties: NodeProperties<"Monitor"> = {
  schema: monitorNodeSchema,
  outputs: [{ label: MonitorOutput.MatchedLogs }],
  hashableFields: (node) => ({
    filters: node.config.initialFilters,
    sampleRate: node.config.sampleRate,
    maxOutputSize: node.config.maxOutputSize,
  }),
  beforeInvalidating: async (node) => {
    // delete all existing entries for this monitor
    await kysely
      .deleteFrom("NodeEntry as ne")
      .using((eb) =>
        eb
          .selectFrom("NodeEntry as entryToDelete")
          .innerJoin("DataChannel as dc", (join) =>
            join
              .onRef("dc.id", "=", "entryToDelete.dataChannelId")
              .on("dc.destinationId", "=", node.id),
          )
          .select("entryToDelete.id")
          .as("entryToDelete"),
      )
      .whereRef("ne.id", "=", "entryToDelete.id")
      .execute();

    // reprocess all logged calls
    await prisma.node.update({
      where: { id: node.id },
      data: checkNodeInput({
        id: node.id,
        projectId: node.projectId,
        type: "Monitor",
        config: {
          ...node.config,
          lastLoggedCallUpdatedAt: new Date(0),
        },
      }),
    });
  },
  beforeProcessing: async (node) => {
    const { initialFilters, lastLoggedCallUpdatedAt, maxOutputSize, sampleRate } = node.config;

    const inputDataChannelId = await kysely
      .selectFrom("DataChannel")
      .where("destinationId", "=", node.id)
      .select(["id"])
      .executeTakeFirst()
      .then((dc) => (dc ? dc.id : null));

    if (!inputDataChannelId) throw new Error(`DataChannel not found for monitor ${node.id}`);

    const numExistingEntries = await kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.dataChannelId", "=", inputDataChannelId)
      .groupBy("ne.dataChannelId")
      .select(sql<number>`count(*)::int`.as("count"))
      .executeTakeFirst()
      .then((r) => (r ? r.count : 0));

    const sampleRateHash = calculateSampleRateHash(sampleRate);
    const nodeId = node.id;

    const newLastLoggedCallUpdatedAt = new Date();

    const loggedCallsToAdd = await constructLoggedCallFiltersQuery({
      filters: initialFilters,
      projectId: node.projectId,
      baseQuery: kysely
        .selectFrom("LoggedCall as lc")
        .where(
          "lc.updatedAt",
          ">=",
          dayjs(lastLoggedCallUpdatedAt).subtract(10, "seconds").toDate(),
        ),
    })
      .leftJoin("NodeEntry as existingNe", (eb) =>
        eb
          .onRef("existingNe.loggedCallId", "=", "lc.id")
          .on("existingNe.dataChannelId", "=", inputDataChannelId),
      )
      .where("existingNe.id", "is", null)
      // hash lc.id and nodeId to compare against a sampleRate hash
      .where(sql`md5(lc.id || '::' || ${nodeId}) <= ${sampleRateHash}`)
      .orderBy("lc.createdAt", "asc")
      .limit(maxOutputSize - numExistingEntries)
      .selectAll("lc")
      .select([sql`md5(lc.id || '::' || ${nodeId})`.as("hash")])
      .execute();

    const entriesToImport = loggedCallsToAdd
      .map((loggedCall) => {
        try {
          const tLoggedCall = typedLoggedCall(loggedCall);

          const validated = validateRowToImport({
            input: tLoggedCall.reqPayload,
            output: tLoggedCall.respPayload?.choices?.[0]?.message,
          });

          if ("error" in validated) return null;
          return {
            ...validated,
            loggedCallId: tLoggedCall.id,
            persistentId: generatePersistentId({
              creationTime: tLoggedCall.requestedAt,
              key: `${tLoggedCall.id}`,
              nodeId: node.id,
            }),
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      })
      .filter(truthyFilter);

    const inputDataChannel = await prisma.dataChannel.findFirst({
      where: { destinationId: node.id },
    });

    if (!inputDataChannel) return;

    const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
      await prepareDatasetEntriesForImport({
        projectId: node.projectId,
        dataChannelId: inputDataChannel.id,
        entriesToImport,
      });

    await prisma.$transaction([
      prisma.datasetEntryInput.createMany({
        data: datasetEntryInputsToCreate,
        skipDuplicates: true,
      }),
      prisma.datasetEntryOutput.createMany({
        data: datasetEntryOutputsToCreate,
        skipDuplicates: true,
      }),
      prisma.nodeEntry.createMany({
        data: nodeEntriesToCreate,
        skipDuplicates: true,
      }),
      prisma.node.update({
        where: { id: node.id },
        data: {
          config: {
            ...node.config,
            lastLoggedCallUpdatedAt: newLastLoggedCallUpdatedAt,
          },
        },
      }),
    ]);
  },
};

const calculateSampleRateHash = (sampleRate: number) => {
  // Ensure the sample rate is between 0 and 100
  if (sampleRate < 0 || sampleRate > 100) {
    throw new Error("Sample rate must be between 0 and 100");
  }

  // Calculate the threshold value
  const maxDecimalValue = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  const thresholdDecimalValue = (maxDecimalValue * BigInt(Math.floor(sampleRate))) / BigInt(100);

  // Convert the threshold value to a hexadecimal string
  let thresholdHex = thresholdDecimalValue.toString(16).toUpperCase();

  // Pad the string with leading zeros if it's not 32 characters long
  while (thresholdHex.length < 32) {
    thresholdHex = "0" + thresholdHex;
  }

  return thresholdHex.toLowerCase();
};
