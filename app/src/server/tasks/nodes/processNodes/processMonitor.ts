import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { MonitorOutput, type NodeProperties } from "~/server/utils/nodes/node.types";
import dayjs from "~/utils/dayjs";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { validateRowToImport } from "~/components/datasets/parseRowsToImport";
import { truthyFilter } from "~/utils/utils";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { generatePersistentId } from "~/server/utils/nodes/utils";

export const monitorProperties: NodeProperties = {
  beforeAll: async (node) => {
    if (node.type !== "Monitor") throw new Error("Invalid node type");

    const { initialFilters, lastLoggedCallUpdatedAt, maxOutputSize, sampleRate } = node.config;

    const numExistingEntries = await kysely
      .selectFrom("NodeEntry as ne")
      .where("ne.nodeId", "=", node.id)
      .groupBy("ne.nodeId")
      .select(sql<number>`count(*)::int`.as("count"))
      .executeTakeFirst();

    if (!numExistingEntries) return;

    const sampleRateHash = calculateSampleRateHash(sampleRate);
    const nodeId = node.id;

    const loggedCallsToAdd = await constructLoggedCallFiltersQuery({
      filters: initialFilters,
      projectId: node.projectId,
      baseQuery: kysely
        .selectFrom("LoggedCall as lc")
        .where("lc.updatedAt", ">=", dayjs(lastLoggedCallUpdatedAt).toDate()),
    })
      .leftJoin("NodeEntry as existingNe", (eb) =>
        eb.onRef("existingNe.loggedCallId", "=", "lc.id").on("existingNe.nodeId", "=", node.id),
      )
      .where("existingNe.id", "is", null)
      // hash lc.id and nodeId to compare against a sampleRate hash
      .where(sql`md5(lc.id || '::' || ${nodeId}) > ${sampleRateHash}`)
      .orderBy("lc.createdAt", "asc")
      .limit(maxOutputSize - numExistingEntries.count)
      .selectAll("lc")
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
      prepareDatasetEntriesForImport({
        projectId: node.projectId,
        nodeId: node.id,
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
    ]);
  },
  outputs: [{ label: MonitorOutput.MatchedLogs }],
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

  return thresholdHex;
};
