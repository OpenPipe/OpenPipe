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
import { enqueueCountDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";

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

    const nodeId = node.id;

    const newLastLoggedCallUpdatedAt = new Date();

    const queryCallsStartTime = Date.now();

    const numEntriesToImport = maxOutputSize - numExistingEntries;

    const sampleRateHash = calculateSampleRateHash(sampleRate);

    const castNodeId = parseInt(nodeId.substring(0, 7), 16);

    console.log("starting queryCalls");

    const loggedCallsQuery = kysely
      .selectFrom((eb) =>
        eb
          .selectFrom((eb) =>
            constructLoggedCallFiltersQuery({
              filters: initialFilters,
              projectId: node.projectId,
              baseQuery: eb.selectFrom("LoggedCall as lc"),
            })
              .where(
                "lc.updatedAt",
                ">=",
                dayjs(lastLoggedCallUpdatedAt).subtract(10, "seconds").toDate(),
              )
              .selectAll("lc")
              .as("subquery1"),
          )
          // compare to sampleRate
          .where(
            sql`(('x' || LEFT(subquery1.id::text, 7))::bit(32)::int #
          ${castNodeId}) < ${sampleRateHash}`,
          )
          .limit(Math.round(maxOutputSize * 1.1))
          .orderBy("subquery1.updatedAt", "desc")
          .selectAll("subquery1")
          .as("subquery"),
      )
      .leftJoin("NodeEntry as existingNe", (eb) =>
        eb
          .onRef("existingNe.loggedCallId", "=", "subquery.id")
          .on("existingNe.dataChannelId", "=", inputDataChannelId),
      )
      .where("existingNe.id", "is", null)
      .selectAll("subquery")
      .limit(Math.round(numEntriesToImport * 1.1));

    // console.log("loggedCallsQuery", loggedCallsQuery.compile());

    const loggedCallsToAdd = await loggedCallsQuery.execute();

    console.log("queryCallsTime", Date.now() - queryCallsStartTime);

    console.log("loggedCallsToAdd", loggedCallsToAdd.length);

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
      .filter(truthyFilter)
      .slice(0, numEntriesToImport);

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

    const saveStartTime = new Date();

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

    console.log("save time", new Date().getTime() - saveStartTime.getTime());

    await enqueueCountDatasetEntryTokens({ projectId: node.projectId });
  },
};

function calculateSampleRateHash(sampleRate: number) {
  // For a 32-bit hash, the maximum value is 2^32 - 1
  const maxHashValue = Math.pow(2, 32) - 1;

  // Calculate the hash threshold based on the sample rate
  // Note: sampleRate is expected to be a percentage (e.g., 10 for 10%)
  const sampleRateHash = Math.round((sampleRate / 100) * maxHashValue);

  // Adjust to match signed 32-bit integer range
  return sampleRateHash - Math.pow(2, 31);
}
