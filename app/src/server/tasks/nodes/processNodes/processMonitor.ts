import { sql } from "kysely";

import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { MonitorOutput } from "~/server/utils/nodes/node.types";
import dayjs from "~/utils/dayjs";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { validateRowToImport } from "~/components/datasets/parseRowsToImport";
import { truthyFilter } from "~/utils/utils";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { generatePersistentId } from "~/server/utils/nodes/utils";
import { type NodeProperties } from "./processNode.task";

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

// export const processMonitor = async (nodeId: string) => {
//   const node = await prisma.node
//     .findUnique({
//       where: { id: nodeId },
//       include: { inputDataChannels: true },
//     })
//     .then((n) => (n ? typedNode(n) : null));
//   const inputDataChannel = node?.inputDataChannels[0];
//   if (node?.type !== "Monitor" || !inputDataChannel) return;
//   const { initialFilters, checkFilters, lastLoggedCallUpdatedAt, maxOutputSize } = node.config;

//   // run initial filters
//   const maxLoggedCallUpdatedAt = dayjs().subtract(1, "minute").toDate();

//   await prisma.node.update({
//     where: { id: nodeId },
//     data: {
//       config: {
//         ...node.config,
//         lastLoggedCallUpdatedAt: maxLoggedCallUpdatedAt.toString(),
//       },
//     },
//   });

//   if (!checkFilters.length) return;

//   // run check filters

//   const llmFilter = checkFilters.find(
//     (f) => f.field === MonitorCheckFiltersExtendedFields.CustomLLMFilter,
//   );

//   if (llmFilter) {
//     // TODO: Run LLM filter check
//   } else {
//     const baseQuery = kysely
//       .updateTable("MonitorMatch as mm")
//       .where("mm.monitorId", "=", nodeId)
//       .where("mm.status", "=", "PENDING")
//       .innerJoin("LoggedCall as lc", "lc.id", "mm.loggedCallId");

//     const updatedQuery = constructLoggedCallFiltersQuery({
//       filters: checkFilters,
//       baseQuery,
//     }) as unknown as typeof baseQuery;

//     await updatedQuery
//       .set({
//         checkPassed: true,
//       })
//       .execute();

//     await kysely
//       .updateTable("MonitorMatch as mm")
//       .where("mm.monitorId", "=", nodeId)
//       .where("mm.status", "=", "PENDING")
//       .set({
//         status: "PROCESSED",
//       })
//       .execute();

//     const cutoffLoggedCallId = await kysely
//       .selectFrom("MonitorMatch")
//       .where("monitorId", "=", nodeId)
//       .where("checkPassed", "=", true)
//       .orderBy("loggedCallId", "desc")
//       .limit(maxOutputSize)
//       .select("loggedCallId")
//       .execute()
//       .then((rows) => rows[rows.length - 1]?.loggedCallId);

//     if (!cutoffLoggedCallId) return;

//     const loggedCallsToAdd = await kysely
//       .selectFrom("MonitorMatch as mm")
//       .where("mm.monitorId", "=", nodeId)
//       .where("mm.checkPassed", "=", true)
//       .where("mm.loggedCallId", ">=", cutoffLoggedCallId)
//       .leftJoin("NodeEntry as ne", (eb) =>
//         eb
//           .onRef("ne.loggedCallId", "=", "mm.loggedCallId")
//           .on("ne.dataChannelId", "=", inputDataChannel.id),
//       )
//       .where("ne.id", "is", null)
//       .innerJoin("LoggedCall as lc", "lc.id", "mm.loggedCallId")
//       .selectAll("lc")
//       .execute();

//     const entriesToImport = loggedCallsToAdd
//       .map((loggedCall) => {
//         try {
//           const tLoggedCall = typedLoggedCall(loggedCall);

//           const validated = validateRowToImport({
//             input: tLoggedCall.reqPayload,
//             output: tLoggedCall.respPayload?.choices?.[0]?.message,
//           });

//           if ("error" in validated) return null;
//           return {
//             ...validated,
//             persistentId: generatePersistentId({
//               creationTime: tLoggedCall.requestedAt,
//               key: `${tLoggedCall.id}`,
//               nodeId,
//             }),
//           };
//         } catch (e) {
//           console.error(e);
//           return null;
//         }
//       })
//       .filter(truthyFilter);

//     const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
//       prepareDatasetEntriesForImport({
//         projectId: node.projectId,
//         nodeId,
//         dataChannelId: inputDataChannel.id,
//         entriesToImport,
//       });

//     await prisma.$transaction([
//       prisma.datasetEntryInput.createMany({
//         data: datasetEntryInputsToCreate,
//         skipDuplicates: true,
//       }),
//       prisma.datasetEntryOutput.createMany({
//         data: datasetEntryOutputsToCreate,
//         skipDuplicates: true,
//       }),
//       prisma.nodeEntry.createMany({
//         data: nodeEntriesToCreate,
//         skipDuplicates: true,
//       }),
//       prisma.nodeEntry.deleteMany({
//         where: {
//           dataChannelId: inputDataChannel.id,
//           loggedCallId: {
//             lt: cutoffLoggedCallId,
//           },
//         },
//       }),
//     ]);
//   }

//   await forwardNodeEntries({ nodeId, nodeOutputLabel: MonitorOutput.MatchedLogs });
// };
