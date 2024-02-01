import { kysely, prisma } from "~/server/db";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { MonitorOutputs, typedNode } from "~/server/utils/nodes/node.types";
import dayjs from "~/utils/dayjs";
import { MonitorCheckFiltersExtendedFields } from "~/types/shared.types";
import { typedLoggedCall } from "~/types/dbColumns.types";
import { validateRowToImport } from "~/components/datasets/parseRowsToImport";
import { truthyFilter } from "~/utils/utils";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import { forwardNodeData } from "../forwardNodeData";
import { generateImportId } from "../importId";

export const processMonitor = async (nodeId: string) => {
  const node = await prisma.node
    .findUnique({
      where: { id: nodeId },
      include: { inputDataChannels: true },
    })
    .then((n) => (n ? typedNode(n) : null));
  const inputDataChannel = node?.inputDataChannels[0];
  if (node?.type !== "Monitor" || !inputDataChannel) return;
  const { initialFilters, checkFilters, lastLoggedCallUpdatedAt, maxOutputSize } = node.config;

  // run initial filters
  const maxLoggedCallUpdatedAt = dayjs().subtract(1, "minute").toDate();

  await kysely
    .insertInto("MonitorMatch")
    .columns(["monitorId", "loggedCallId", "createdAt"])
    .expression((eb) =>
      constructLoggedCallFiltersQuery({
        filters: initialFilters,
        projectId: node.projectId,
        baseQuery: eb
          .selectFrom("LoggedCall as lc")
          .where("lc.updatedAt", ">=", lastLoggedCallUpdatedAt)
          .where("lc.updatedAt", "<=", maxLoggedCallUpdatedAt),
      }).select((eb) => [eb.val(nodeId).as("monitorId"), "lc.id", "lc.createdAt"]),
    )
    .onConflict((oc) => oc.columns(["monitorId", "loggedCallId"]).doNothing())
    .execute();

  await prisma.node.update({
    where: { id: nodeId },
    data: {
      config: {
        ...node.config,
        lastLoggedCallUpdatedAt: maxLoggedCallUpdatedAt.toString(),
      },
    },
  });

  if (!checkFilters.length) return;

  // run check filters

  const llmFilter = checkFilters.find(
    (f) => f.field === MonitorCheckFiltersExtendedFields.CustomLLMFilter,
  );

  if (llmFilter) {
    // TODO: Run LLM filter check
  } else {
    const baseQuery = kysely
      .updateTable("MonitorMatch as mm")
      .where("mm.monitorId", "=", nodeId)
      .where("mm.status", "=", "PENDING")
      .innerJoin("LoggedCall as lc", "lc.id", "mm.loggedCallId");

    const updatedQuery = constructLoggedCallFiltersQuery({
      filters: checkFilters,
      baseQuery,
    }) as unknown as typeof baseQuery;

    await updatedQuery
      .set({
        checkPassed: true,
      })
      .execute();

    await kysely
      .updateTable("MonitorMatch as mm")
      .where("mm.monitorId", "=", nodeId)
      .where("mm.status", "=", "PENDING")
      .set({
        status: "PROCESSED",
      })
      .execute();

    const cutoffLoggedCallId = await kysely
      .selectFrom("MonitorMatch")
      .where("monitorId", "=", nodeId)
      .where("checkPassed", "=", true)
      .orderBy("loggedCallId", "desc")
      .limit(maxOutputSize)
      .select("loggedCallId")
      .execute()
      .then((rows) => rows[rows.length - 1]?.loggedCallId);

    if (!cutoffLoggedCallId) return;

    const loggedCallsToAdd = await kysely
      .selectFrom("MonitorMatch as mm")
      .where("mm.monitorId", "=", nodeId)
      .where("mm.checkPassed", "=", true)
      .where("mm.loggedCallId", ">=", cutoffLoggedCallId)
      .leftJoin("NodeData as nd", (eb) =>
        eb
          .onRef("nd.loggedCallId", "=", "mm.loggedCallId")
          .on("nd.dataChannelId", "=", inputDataChannel.id),
      )
      .where("nd.id", "is", null)
      .innerJoin("LoggedCall as lc", "lc.id", "mm.loggedCallId")
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
            importId: generateImportId({
              uniquePrefix: `${tLoggedCall.createdAt.toISOString()}-${tLoggedCall.id}`,
              nodeId,
            }),
          };
        } catch (e) {
          console.error(e);
          return null;
        }
      })
      .filter(truthyFilter);

    const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeDataToCreate } =
      prepareDatasetEntriesForImport({
        projectId: node.projectId,
        nodeId,
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
      prisma.nodeData.createMany({
        data: nodeDataToCreate,
        skipDuplicates: true,
      }),
      prisma.nodeData.deleteMany({
        where: {
          dataChannelId: inputDataChannel.id,
          loggedCallId: {
            lt: cutoffLoggedCallId,
          },
        },
      }),
    ]);
  }

  await forwardNodeData({ nodeId, nodeOutputLabel: MonitorOutputs.MatchedLogs });
};
