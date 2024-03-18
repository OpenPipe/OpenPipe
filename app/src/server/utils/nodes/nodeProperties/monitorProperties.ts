import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";

import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import dayjs from "~/utils/dayjs";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { validateRowToImport } from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import { truthyFilter } from "~/utils/utils";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { generatePersistentId } from "~/server/utils/nodes/utils";
import { MonitorOutput, type NodeProperties } from "./nodeProperties.types";
import { monitorNodeSchema } from "../node.types";
import { checkNodeInput } from "../checkNodeInput";
import { enqueueCountDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";

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

    const newLastLoggedCallUpdatedAt = new Date();

    const queryCallsStartTime = Date.now();

    const numEntriesToImport = maxOutputSize - numExistingEntries;

    console.log("starting queryCalls");

    const loggedCallsQuery = kysely
      .selectFrom((eb) =>
        constructLoggedCallFiltersQuery({
          filters: initialFilters,
          projectId: node.projectId,
          baseQuery: eb.selectFrom("LoggedCall as lc"),
          sampleRate,
          maxOutputSize: Math.round(maxOutputSize * 1.1),
        })
          .where(
            "lc.updatedAt",
            ">=",
            dayjs(lastLoggedCallUpdatedAt).subtract(10, "seconds").toDate(),
          )
          .selectAll("lc")
          .orderBy("lc.updatedAt", "asc")
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
        supportDPO: true,
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

    await kysely
      .updateTable("NodeEntry as ne")
      .set({ status: "PROCESSED" })
      .from("DataChannel as dc")
      .where("dc.destinationId", "=", node.id)
      .whereRef("ne.dataChannelId", "=", "dc.id")
      .where("ne.status", "=", "PENDING")
      .execute();

    await enqueueCountDatasetEntryTokens({ projectId: node.projectId });
  },
};

function generateSampleRateUUID(percentage: number): string {
  // Ensure the percentage is within bounds
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  // Convert the percentage to a fraction of the maximum value of the first 6 hex digits of UUID
  // The first 6 hex digits are chosen for simplicity and to avoid interfering with UUID version and variant bits
  const fraction = percentage / 100;
  const maxFirst6HexValue = 0xffffff; // Max value for 6 hex digits
  const thresholdValue = Math.floor(fraction * maxFirst6HexValue);

  // Format the threshold value into a 6-digit hex string
  const thresholdHex = thresholdValue.toString(16).padStart(6, "0");

  // Generate a random UUID
  let uuid = uuidv4();

  // Replace the first 6 hex digits of the UUID with our threshold-based hex digits
  // Ensuring it aligns with the percentage-based sampling requirement
  uuid = thresholdHex + uuid.slice(6);

  return uuid;
}
