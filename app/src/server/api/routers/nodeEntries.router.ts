import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { pick } from "lodash-es";
import { z } from "zod";
import { type ComparisonModel, type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { validateRowToImport } from "~/server/utils/datasetEntryCreation/parseRowsToImport";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { enqueueCountDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { constructNodeEntryFiltersQuery } from "~/server/utils/constructNodeEntryFiltersQuery";
import { constructEvaluationFiltersQuery } from "~/server/utils/constructEvaluationFiltersQuery";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import {
  ORIGINAL_MODEL_ID,
  typedNodeEntry,
  typedFineTune,
  typedLoggedCall,
} from "~/types/dbColumns.types";
import { SortOrder, filtersSchema, toolsInput } from "~/types/shared.types";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { isComparisonModel } from "~/utils/comparisonModels";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { truthyFilter } from "~/utils/utils";
import { typedNode, DEFAULT_MAX_OUTPUT_SIZE, RelabelOption } from "~/server/utils/nodes/node.types";
import {
  prepareIntegratedArchiveCreation,
  prepareIntegratedDatasetCreation,
} from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { generatePersistentId, creationTimeFromPersistentId } from "~/server/utils/nodes/utils";
import { hashDatasetEntryInput, hashDatasetEntryOutput } from "~/server/utils/nodes/hashNode";
import {
  enqueueProcessNode,
  processNode,
} from "~/server/tasks/nodes/processNodes/processNode.task";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/updatePruningRuleMatches";
import { startDatasetTestJobs } from "~/server/utils/nodes/startTestJobs";
import { ManualRelabelOutput } from "~/server/utils/nodes/nodeProperties/manualRelabelProperties";

export const nodeEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        page: z.number(),
        pageSize: z.number(),
        sortOrder: z
          .object({
            field: z.enum(["persistentId", "split", "inputTokens", "outputTokens"]),
            order: z.enum(["asc", "desc"]),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, page, pageSize } = input;

      const { projectId, nodeId } = await prisma.dataset.findUniqueOrThrow({
        where: { id: datasetId },
      });
      await requireCanViewProject(projectId, ctx);

      if (!nodeId) throw new TRPCError({ message: "Dataset node not found", code: "NOT_FOUND" });

      const baseQuery = constructNodeEntryFiltersQuery({ filters, datasetNodeId: nodeId });

      let entriesQuery = baseQuery
        .select([
          "ne.id as id",
          "ne.split as split",
          "ne.persistentId as persistentId",
          "ne.createdAt as createdAt",
          "ne.updatedAt as updatedAt",
          "ne.parentNodeEntryId",
          "ne.dataChannelId",
          "dei.messages as messages",
          "dei.inputTokens as inputTokens",
          "deo.output as output",
          "deo.outputTokens as outputTokens",
        ])
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      if (input.sortOrder) {
        let orderByField: "ne.persistentId" | "ne.split" | "dei.inputTokens" | "deo.outputTokens";
        if (input.sortOrder.field === "persistentId") {
          orderByField = "ne.persistentId";
        } else if (input.sortOrder.field === "split") {
          orderByField = "ne.split";
        } else if (input.sortOrder.field === "inputTokens") {
          orderByField = "dei.inputTokens";
        } else {
          orderByField = "deo.outputTokens";
        }

        entriesQuery = entriesQuery.orderBy(orderByField, input.sortOrder.order);
      } else {
        entriesQuery = entriesQuery.orderBy("ne.persistentId", "desc");
      }

      const [entries, matchingCounts, totalTestingCount] = await Promise.all([
        entriesQuery
          .orderBy("inputHash")
          .execute()
          .then((res) =>
            res.map((entry) => ({
              ...entry,
              creationTime: creationTimeFromPersistentId(entry.persistentId),
            })),
          ),
        baseQuery
          .select([
            sql<number>`count(case when ne.split = 'TRAIN' then 1 end)::int`.as(
              "matchingTrainingCount",
            ),
            sql<number>`count(*)::int`.as("matchingCount"),
          ])
          .executeTakeFirst(),
        kysely
          .selectFrom("NodeEntry as ne")
          .innerJoin("DataChannel as dc", (join) =>
            join.onRef("dc.id", "=", "ne.dataChannelId").on("dc.destinationId", "=", nodeId),
          )
          .where("ne.split", "=", "TEST")
          .select(sql<number>`count(*)::int`.as("totalTestingCount"))
          .executeTakeFirst()
          .then((r) => r?.totalTestingCount ?? 0),
      ]);

      return {
        entries,
        matchingCount: matchingCounts?.matchingCount ?? 0,
        matchingTrainingCount: matchingCounts?.matchingTrainingCount ?? 0,
        totalTestingCount,
      };
    }),
  get: protectedProcedure
    .input(z.object({ persistentId: z.string(), datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const nodeEntry = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", input.datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .innerJoin("DataChannel as dc", "dc.destinationId", "n.id")
        .innerJoin("NodeEntry as ne", (join) =>
          join
            .onRef("ne.dataChannelId", "=", "dc.id")
            .on("ne.persistentId", "=", input.persistentId),
        )
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
        .selectAll("ne")
        .select((eb) => [
          "ne.updatedAt as updatedAt",
          "n.projectId as projectId",
          "dei.messages as messages",
          "dei.tool_choice as tool_choice",
          "dei.tools as tools",
          "dei.response_format as response_format",
          "dei.inputTokens as inputTokens",
          "deo.output as output",
          "deo.outputTokens as outputTokens",
          jsonArrayFrom(
            eb
              .selectFrom("PruningRuleMatch as prm")
              .whereRef("prm.inputHash", "=", "ne.inputHash")
              .innerJoin("PruningRule as pr", "pr.id", "prm.pruningRuleId")
              .where("pr.datasetId", "=", input.datasetId)
              .select(["pr.textToMatch", "pr.tokensInText"]),
          ).as("matchedRules"),
        ])
        .executeTakeFirst();

      if (!nodeEntry) {
        throw new TRPCError({ message: "Node data not found", code: "NOT_FOUND" });
      }

      await requireCanViewProject(nodeEntry.projectId, ctx);

      return typedNodeEntry(nodeEntry);
    }),
  createFromLoggedCalls: protectedProcedure
    .input(
      z.object({
        datasetId: z.string().optional(),
        newDatasetParams: z.object({ projectId: z.string(), name: z.string() }).optional(),
        filters: filtersSchema,
        defaultToSelected: z.boolean(),
        selectedLogIds: z.string().array(),
        deselectedLogIds: z.string().array(),
        sampleSize: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let datasetId;
      let manualRelabelNodeId;
      let projectId;
      const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

      if (input.datasetId) {
        datasetId = input.datasetId;

        const datasetNode = await kysely
          .selectFrom("Dataset as d")
          .where("d.id", "=", datasetId)
          .innerJoin("Node as n", "n.id", "d.nodeId")
          .selectAll("n")
          .executeTakeFirst();
        if (!datasetNode) return error("Dataset node not found");

        const tDatasetNode = typedNode(datasetNode);
        if (tDatasetNode.type !== "Dataset") return error("Dataset node incorrectly typed");

        projectId = datasetNode.projectId;
        manualRelabelNodeId = tDatasetNode.config.manualRelabelNodeId;
      } else if (input.newDatasetParams) {
        projectId = input.newDatasetParams.projectId;

        const preparedIntegratedDatasetCreation = prepareIntegratedDatasetCreation({
          projectId,
          datasetName: input.newDatasetParams.name,
        });

        datasetId = preparedIntegratedDatasetCreation.datasetId;
        manualRelabelNodeId = preparedIntegratedDatasetCreation.manualRelabelNodeId;

        prismaCreations.push(...preparedIntegratedDatasetCreation.prismaCreations);
      } else {
        return error("No datasetId or newDatasetParams provided");
      }

      const latestRequestLogsImport = await prisma.node.findFirst({
        where: {
          projectId,
          type: "Archive",
          name: { startsWith: "Request Logs Import #" },
        },
        orderBy: { createdAt: "desc" },
      });

      const latestRequestLogsImportIndex = latestRequestLogsImport
        ? parseInt(latestRequestLogsImport.name.split("#")[1] as string)
        : 0;

      const preparedArchiveCreation = prepareIntegratedArchiveCreation({
        projectId,
        name: `Request Logs Import #${latestRequestLogsImportIndex + 1}`,
        maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
        relabelLLM: RelabelOption.SkipRelabel,
      });

      prismaCreations.push(
        ...preparedArchiveCreation.prismaCreations,
        prisma.dataChannel.create({
          data: {
            originId: preparedArchiveCreation.relabeledOutputId,
            destinationId: manualRelabelNodeId,
          },
        }),
      );

      await requireCanModifyProject(projectId, ctx);

      const loggedCalls = await constructLoggedCallFiltersQuery({
        filters: input.filters,
        projectId,
        selectionParams: {
          ...pick(input, ["defaultToSelected", "selectedLogIds", "deselectedLogIds"]),
          removeUnsuccessful: true,
        },
      })
        .select(["lc.id", "lc.reqPayload", "lc.respPayload", "lc.inputTokens", "lc.outputTokens"])
        .orderBy(sql`random()`)
        .limit(input.sampleSize)
        .execute();

      if (!loggedCalls.length) {
        return error("No matching request logs");
      }

      const importedAt = new Date();

      const rowsToConvert = loggedCalls
        .map((loggedCall, index) => {
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
                creationTime: importedAt,
                key: index.toString(),
                nodeId: preparedArchiveCreation.archiveNodeId,
              }),
              loggedCallId: tLoggedCall.id,
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        })
        .filter(truthyFilter);

      const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeEntriesToCreate } =
        await prepareDatasetEntriesForImport({
          projectId,
          dataChannelId: preparedArchiveCreation.archiveInputChannelId,
          entriesToImport: rowsToConvert,
        });

      // Ensure dataset and dataset entries are created atomically
      await prisma.$transaction([
        ...prismaCreations,
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

      await enqueueCountDatasetEntryTokens({ projectId });

      await processNode.runNow({
        nodeId: preparedArchiveCreation.archiveNodeId,
      });

      return success({ datasetId, archiveNodeId: preparedArchiveCreation.archiveNodeId });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          split: z.enum(["TRAIN", "TEST"]).optional(),
          messages: z.string().optional(),
          tools: z.string().optional(),
          output: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const nodeEntry = await kysely
        .selectFrom("NodeEntry as ne")
        .where("ne.id", "=", input.id)
        .innerJoin("NodeEntry as parentNodeEntry", "parentNodeEntry.id", "ne.parentNodeEntryId")
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "ne.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "ne.outputHash")
        .innerJoin("DataChannel as dc", "dc.id", "ne.dataChannelId")
        .innerJoin("NodeOutput as no", (join) =>
          join
            .onRef("no.id", "=", "dc.originId")
            .on("no.label", "=", ManualRelabelOutput.Relabeled),
        )
        .selectAll("ne")
        .select((eb) => [
          "parentNodeEntry.inputHash as parentNodeEntryInputHash",
          "dei.messages as messages",
          "dei.tool_choice as tool_choice",
          "dei.tools as tools",
          "dei.response_format as response_format",
          "deo.output as output",
          jsonObjectFrom(
            eb
              .selectFrom("Node as n")
              .whereRef("n.id", "=", "dc.destinationId")
              .innerJoin("Dataset as d", "d.nodeId", "n.id")
              .select(["n.projectId", "n.id", "n.type", "n.config", "n.hash", "d.id as datasetId"]),
          ).as("node"),
          "dc.id as relabeledDataChannelId",
        ])
        .executeTakeFirst();

      if (!nodeEntry?.node) return error("NodeEntry not found");

      const tNode = typedNode(nodeEntry.node);
      if (tNode.type !== "Dataset") return error("Dataset node not found");

      await requireCanModifyProject(tNode.projectId, ctx);

      let updatedMessages = undefined;
      try {
        if (input.updates.messages) {
          updatedMessages = JSON.parse(input.updates.messages);
        }
      } catch (e) {
        return error("Invalid JSON for messages");
      }

      let updatedTools = undefined;
      try {
        if (input.updates.tools) {
          updatedTools = JSON.parse(input.updates.tools);
          toolsInput.parse(updatedTools);
        }
      } catch (e) {
        return error("Invalid tools format");
      }

      let updatedOutput = undefined;
      try {
        // The client might send "null" as a string, so we need to check for that
        if (input.updates.output && input.updates.output !== "null") {
          updatedOutput = JSON.parse(input.updates.output);
        }
      } catch (e) {
        return error("Invalid JSON for output");
      }

      const updatedSplit = input.updates.split ?? nodeEntry.split;
      const splitUpdated = updatedSplit !== nodeEntry.split;

      if (splitUpdated || updatedMessages || updatedTools || updatedOutput) {
        nodeEntry.messages = updatedMessages ?? nodeEntry.messages;
        nodeEntry.tools = updatedTools ?? nodeEntry.tools;
        nodeEntry.output = updatedOutput ?? nodeEntry.output;

        let tNodeEntry;
        try {
          tNodeEntry = typedNodeEntry(nodeEntry);
        } catch (e) {
          return error("Error parsing updates");
        }

        const updatedInputHash = hashDatasetEntryInput({
          ...tNodeEntry,
          tool_choice: tNodeEntry.tool_choice ?? undefined,
          tools: tNodeEntry.tools ?? undefined,
          response_format: tNodeEntry.response_format ?? undefined,
          projectId: tNode.projectId,
        });
        const inputUpdated = updatedInputHash !== tNodeEntry.inputHash;
        if (inputUpdated) {
          await kysely
            .insertInto("DatasetEntryInput")
            .values({
              projectId: tNode.projectId,
              tool_choice: JSON.stringify(tNodeEntry.tool_choice),
              tools: JSON.stringify(tNodeEntry.tools),
              messages: JSON.stringify(tNodeEntry.messages),
              response_format: JSON.stringify(tNodeEntry.response_format),
              hash: updatedInputHash,
            })
            .onConflict((oc) => oc.columns(["hash"]).doNothing())
            .executeTakeFirst();
        }

        const updatedOutputHash = hashDatasetEntryOutput({
          ...tNodeEntry,
          projectId: tNode.projectId,
        });
        const outputUpdated = updatedOutputHash !== tNodeEntry.outputHash;
        if (outputUpdated) {
          await kysely
            .insertInto("DatasetEntryOutput")
            .values({
              projectId: tNode.projectId,
              output: JSON.stringify(tNodeEntry.output),
              hash: updatedOutputHash,
            })
            .onConflict((oc) => oc.columns(["hash"]).doNothing())
            .executeTakeFirst();
        }

        if (splitUpdated || inputUpdated || outputUpdated) {
          // save the update in ManualRelabel Node's cache
          const manualRelabelNode = await prisma.node.findUnique({
            where: {
              id: tNode.config.manualRelabelNodeId,
            },
          });

          if (!manualRelabelNode) return error("Unable to find ManualRelabel Node");

          await kysely.transaction().execute(async (trx) => {
            const cachedProcessedEntry = await trx
              .selectFrom("CachedProcessedEntry")
              .where("nodeHash", "=", manualRelabelNode.hash)
              .where("nodeEntryPersistentId", "=", nodeEntry.persistentId)
              .where("incomingInputHash", "=", nodeEntry.parentNodeEntryInputHash)
              .select(["id"])
              .executeTakeFirst();

            if (cachedProcessedEntry) {
              await trx
                .updateTable("CachedProcessedEntry")
                .where("id", "=", cachedProcessedEntry.id)
                .set({
                  outgoingInputHash: updatedInputHash,
                  outgoingOutputHash: updatedOutputHash,
                  outgoingSplit: updatedSplit,
                  updatedAt: new Date(),
                })
                .execute();
            } else {
              await trx
                .insertInto("CachedProcessedEntry")
                .values({
                  id: uuidv4(),
                  projectId: tNode.projectId,
                  nodeHash: manualRelabelNode.hash,
                  nodeEntryPersistentId: nodeEntry.persistentId,
                  incomingInputHash: nodeEntry.parentNodeEntryInputHash,
                  outgoingInputHash: updatedInputHash,
                  outgoingOutputHash: updatedOutputHash,
                  outgoingSplit: updatedSplit,
                  updatedAt: new Date(),
                })
                .execute();
            }
          });

          const parentNodeEntryId = tNodeEntry.parentNodeEntryId;

          // delete all NodeEntries downstream of the ManualRelabel and Dataset NodeEntry
          // (excluding the NodeEntry that we're editing)
          await kysely
            .deleteFrom("NodeEntry")
            .where((eb) =>
              eb.or([
                eb("parentNodeEntryId", "=", parentNodeEntryId),
                eb("parentNodeEntryId", "=", input.id),
              ]),
            )
            .where("id", "!=", input.id)
            .execute();

          // Tell ManualRelabel Node to reprocess the NodeEntry
          await kysely
            .updateTable("NodeEntry as ne")
            .from("DataChannel as dc")
            .whereRef("dc.id", "=", "ne.dataChannelId")
            .where("dc.destinationId", "=", manualRelabelNode.id)
            .where("ne.persistentId", "=", tNodeEntry.persistentId)
            .set({
              status: "PENDING",
              updatedAt: new Date(),
            })
            .execute();

          // Update the NodeEntry directly in the Dataset Node
          await kysely
            .updateTable("NodeEntry")
            .where("id", "=", tNodeEntry.id)
            .set({
              status: "PENDING",
              inputHash: updatedInputHash,
              outputHash: updatedOutputHash,
              split: updatedSplit,
              dataChannelId: tNodeEntry.relabeledDataChannelId,
              updatedAt: new Date(),
            })
            .execute();

          await enqueueCountDatasetEntryTokens({ projectId: tNode.projectId });

          await updateDatasetPruningRuleMatches({
            nodeHash: tNode.hash,
            datasetId: tNode.datasetId,
            nodeEntryBaseQuery: kysely
              .selectFrom("NodeEntry as ne")
              .where("ne.id", "=", tNodeEntry.id),
          });

          await enqueueProcessNode({ nodeId: manualRelabelNode.id });

          if (updatedSplit === "TEST") {
            await startDatasetTestJobs({
              datasetId: tNode.datasetId,
              nodeEntryBaseQuery: kysely
                .selectFrom("NodeEntry as ne")
                .where("ne.id", "=", input.id),
            });
          }
        }
      }

      return success("Update complete");
    }),

  // TODO: move to datasets router after great migration
  listTestingEntries: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        visibleModelIds: z.string().array(),
        page: z.number(),
        pageSize: z.number(),
        sortOrder: z
          .object({
            modelId: z.string(),
            evalId: z.string(),
            order: z.enum([SortOrder.ASC, SortOrder.DESC]),
          })
          .optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, visibleModelIds, page, pageSize, sortOrder } = input;

      const dataset = await kysely
        .selectFrom("Dataset as d")
        .where("d.id", "=", datasetId)
        .innerJoin("Node as n", "n.id", "d.nodeId")
        .leftJoin("FineTune as ft", (join) =>
          join.onRef("ft.datasetId", "=", "d.id").on("ft.status", "=", "DEPLOYED"),
        )
        .groupBy(["d.id", "n.id"])
        .select([
          "d.id as id",
          "d.projectId as projectId",
          sql<ComparisonModel[]>`d."enabledComparisonModels"::text[]`.as("enabledComparisonModels"),
          "n.id as nodeId",
          "n.hash as nodeHash",
          "n.type as nodeType",
          "n.config as nodeConfig",
          sql<number>`count(ft.id)::int`.as("numDeployedModels"),
        ])
        .executeTakeFirst();

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      const baseQuery = constructEvaluationFiltersQuery({ filters, nodeId: dataset.nodeId });

      let updatedQuery = baseQuery;

      if (sortOrder) {
        updatedQuery = updatedQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom("DatasetEval as de")
                .where("de.id", "=", sortOrder.evalId)
                .innerJoin("Dataset as d", "d.id", "de.datasetId")
                .innerJoin("DatasetEvalNodeEntry as dene", "dene.datasetEvalId", "de.id")
                .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
                .innerJoin("NodeEntry as ne", (join) =>
                  join
                    .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
                    .onRef("ne.dataChannelId", "=", "dc.id")
                    .on("ne.split", "=", "TEST"),
                )
                .leftJoin(
                  (eb) =>
                    eb
                      .selectFrom("DatasetEvalResult as der")
                      .leftJoin("DatasetEvalOutputSource as comparisonDeos", (join) =>
                        join
                          .onRef("comparisonDeos.id", "=", "der.comparisonOutputSourceId")
                          .on("comparisonDeos.modelId", "in", visibleModelIds)
                          .on("comparisonDeos.datasetEvalId", "=", sortOrder.evalId),
                      )
                      .where((eb) =>
                        eb.or([
                          eb("der.comparisonOutputSourceId", "is", null),
                          eb("comparisonDeos.id", "is not", null),
                        ]),
                      )
                      .selectAll("der")
                      .as("der"),
                  (join) => join.onRef("der.datasetEvalNodeEntryId", "=", "dene.id"),
                )
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .where("deos.modelId", "=", sortOrder.modelId)
                .select((eb) => [
                  "dene.nodeEntryPersistentId as denePersistentId",
                  eb.fn.agg<number>("AVG", [`der.score`]).as("score"),
                ])
                .groupBy("dene.nodeEntryPersistentId")
                .as("averageScoreForEval"),
            (join) => join.onRef("averageScoreForEval.denePersistentId", "=", "ne.persistentId"),
          )
          // Ensure that rows with the sort eval applied are always shown first
          .orderBy(
            () =>
              sql`CASE
                WHEN "averageScoreForEval"."denePersistentId" IS NULL THEN 1
                ELSE 0
              END`,
          )
          .orderBy(`averageScoreForEval.score`, sortOrder.order);
      }

      const [entries, count] = await Promise.all([
        updatedQuery
          .select((eb) => [
            "ne.id as id",
            "dei.messages as messages",
            "dei.response_format as response_format",
            "deo.output as output",
            jsonArrayFrom(
              eb
                .selectFrom("FineTuneTestingEntry as ftte")
                .innerJoin("DatasetEntryInput as dei", "dei.hash", "ftte.inputHash")
                .leftJoin("DatasetEntryOutput as deo", "deo.hash", "ftte.outputHash")
                .select([
                  "ftte.id",
                  "ftte.modelId",
                  "ftte.errorMessage",
                  "ftte.finishReason",
                  "dei.inputTokens",
                  "deo.output",
                  "deo.outputTokens",
                ])
                .whereRef("ftte.inputHash", "=", "ne.inputHash")
                .where("ftte.modelId", "in", visibleModelIds),
            ).as("fineTuneTestDatasetEntries"),
            jsonArrayFrom(
              eb
                .selectFrom("DatasetEvalResult as der")
                .whereRef("der.nodeEntryInputHash", "=", "ne.inputHash")
                .innerJoin("DatasetEvalNodeEntry as dene", (join) =>
                  join
                    .onRef("dene.nodeEntryPersistentId", "=", "ne.persistentId")
                    .onRef("der.datasetEvalNodeEntryId", "=", "dene.id"),
                )
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .leftJoin(
                  "DatasetEvalOutputSource as comparisonDeos",
                  "comparisonDeos.id",
                  "der.comparisonOutputSourceId",
                )
                .select(["der.score", "der.status", "deos.datasetEvalId", "deos.modelId"])
                .where((eb) =>
                  eb.or([
                    eb("der.comparisonOutputSourceId", "is", null),
                    eb("comparisonDeos.modelId", "in", visibleModelIds),
                  ]),
                ),
            ).as("datasetEvalResults"),
          ])
          .orderBy("ne.persistentId", "desc")
          .orderBy("ne.inputHash", "desc")
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .execute(),
        baseQuery
          .select([sql<number>`count(*)::int`.as("count")])
          .executeTakeFirst()
          .then((res) => res?.count ?? 0),
      ]);

      const generatedOutputsPerRow =
        dataset.enabledComparisonModels.length + dataset.numDeployedModels;

      const pageIncomplete = entries.some(
        (entry) =>
          entry.fineTuneTestDatasetEntries.length !== generatedOutputsPerRow ||
          entry.fineTuneTestDatasetEntries.some((entry) => !entry.output) ||
          entry.datasetEvalResults.some(
            (entry) => entry.status === "PENDING" || entry.status === "IN_PROGRESS",
          ),
      );

      return {
        entries,
        count,
        pageIncomplete,
      };
    }),
  testingStats: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        modelId: z.string(),
        visibleModelIds: z.string().array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { datasetId, filters, modelId, visibleModelIds } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
        include: {
          datasetEvals: true,
        },
      });

      if (!dataset?.nodeId)
        throw new TRPCError({ message: "Dataset node does not exist", code: "NOT_FOUND" });

      const finishedCount = await kysely
        .selectFrom("NodeEntry as ne")
        .innerJoin("DataChannel as dc", (join) =>
          join.on("dc.destinationId", "=", dataset.nodeId).onRef("ne.dataChannelId", "=", "dc.id"),
        )
        .where("ne.split", "=", "TEST")
        .innerJoin("FineTuneTestingEntry as ftte", (join) =>
          join
            .onRef("ftte.inputHash", "=", "ne.inputHash")
            .on("ftte.modelId", "=", modelId)
            .on("ftte.outputHash", "is not", null),
        )
        .select([sql<number>`count(*)::int`.as("count")])
        .executeTakeFirst()
        .then((res) => res?.count ?? 0);

      const baseQuery = constructEvaluationFiltersQuery({ filters, nodeId: dataset.nodeId });

      let updatedPerformanceQuery = baseQuery;

      let i = 0;
      // Add average score for each dataset eval
      for (const datasetEval of dataset?.datasetEvals ?? []) {
        const alias = `eval${i++}`;
        updatedPerformanceQuery = updatedPerformanceQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom(`DatasetEval as de`)
                .where("de.id", "=", datasetEval.id)
                .innerJoin("Dataset as d", "d.id", "de.datasetId")
                .innerJoin("DataChannel as dc", "dc.destinationId", "d.nodeId")
                .innerJoin("DatasetEvalNodeEntry as dene", "dene.datasetEvalId", "de.id")
                .innerJoin("NodeEntry as ne", (join) =>
                  join
                    .onRef("ne.persistentId", "=", "dene.nodeEntryPersistentId")
                    .onRef("ne.dataChannelId", "=", "dc.id"),
                )
                .leftJoin("DatasetEvalResult as der", (join) =>
                  join
                    .onRef("der.datasetEvalNodeEntryId", "=", "dene.id")
                    .onRef("der.nodeEntryInputHash", "=", "ne.inputHash"),
                )
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .where("deos.modelId", "=", modelId)
                .leftJoin(
                  "DatasetEvalOutputSource as comparisonDeos",
                  "comparisonDeos.id",
                  "der.comparisonOutputSourceId",
                )
                .where((eb) =>
                  eb.or([
                    eb("der.comparisonOutputSourceId", "is", null),
                    eb("comparisonDeos.modelId", "in", visibleModelIds),
                  ]),
                )
                .select((eb) => [
                  "dene.nodeEntryPersistentId as persistentId",
                  eb.fn.agg<number>("AVG", [`der.score`]).as(`scoreForEval`),
                  sql`COUNT(CASE WHEN der.score = 1 THEN 1 ELSE NULL END)`.as(`wins`),
                  sql`COUNT(CASE WHEN der.score = .5 THEN 1 ELSE NULL END)`.as(`ties`),
                  sql`COUNT(CASE WHEN der.score = 0 THEN 1 ELSE NULL END)`.as(`losses`),
                  sql`COUNT(CASE WHEN der.status = 'PENDING' OR der.status = 'IN_PROGRESS' THEN 1 ELSE NULL END)`.as(
                    `pending`,
                  ),
                  sql`COUNT(CASE WHEN der.status = 'COMPLETE' OR der.status = 'ERROR' THEN 1 ELSE NULL END)`.as(
                    `complete`,
                  ),
                ])
                .groupBy(["dene.nodeEntryPersistentId"])
                .as(alias),
            (join) => join.onRef(`${alias}.persistentId`, "=", "ne.persistentId"),
          )
          .select((eb) => [
            eb.fn.agg<number>("AVG", [`${alias}.scoreForEval`]).as(`score_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.wins) AS INT)`).as(`totalWins_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.ties) AS INT)`).as(`totalTies_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.losses) AS INT)`).as(`totalLosses_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.pending) AS INT)`).as(`totalPending_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.complete) AS INT)`).as(`totalComplete_${datasetEval.id}`),
            sql
              .raw(`CAST(COUNT(${alias}."persistentId") AS INT)`)
              .as(`totalCount_${datasetEval.id}`),
          ]) as unknown as typeof baseQuery;
      }

      const performance = await updatedPerformanceQuery
        .select("dc.destinationId")
        .groupBy("dc.destinationId")
        .executeTakeFirst()
        .then((result) => result as typeof result & Record<string, number>);

      const evalPerformances: Record<
        string,
        {
          totalCount: number;
          numPending: number;
          numComplete: number;
          score: number | null;
          totalWins: number | null;
          totalTies: number | null;
          totalLosses: number | null;
        }
      > = {};

      for (const datasetEval of dataset?.datasetEvals ?? []) {
        if (
          !performance ||
          !(`totalCount_${datasetEval.id}` in performance) ||
          !performance[`totalCount_${datasetEval.id}`]
        )
          continue;
        evalPerformances[datasetEval.id] = {
          totalCount: performance[`totalCount_${datasetEval.id}`] ?? 0,
          numPending: performance[`totalPending_${datasetEval.id}`] ?? 0,
          numComplete: performance[`totalComplete_${datasetEval.id}`] ?? 0,
          score: performance[`score_${datasetEval.id}`] ?? null,
          totalWins: performance[`totalWins_${datasetEval.id}`] ?? null,
          totalTies: performance[`totalTies_${datasetEval.id}`] ?? null,
          totalLosses: performance[`totalLosses_${datasetEval.id}`] ?? null,
        };
      }

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      let fineTune;
      if (modelId !== ORIGINAL_MODEL_ID && !isComparisonModel(modelId)) {
        fineTune = typedFineTune(
          await prisma.fineTune.findFirstOrThrow({
            where: { id: modelId },
            select: {
              slug: true,
              baseModel: true,
              provider: true,
            },
          }),
        );
      }

      const resultsPending = Object.values(evalPerformances).some(
        (performance) => performance.numPending > 0,
      );

      return {
        fineTune,
        finishedCount,
        evalPerformances,
        resultsPending,
      };
    }),
});
