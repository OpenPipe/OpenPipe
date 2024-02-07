import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { pick } from "lodash-es";
import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { validateRowToImport } from "~/components/datasets/parseRowsToImport";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { countDatasetEntryTokens } from "~/server/tasks/fineTuning/countDatasetEntryTokens.task";
import { constructNodeDataFiltersQuery } from "~/server/utils/constructNodeDataFiltersQuery";
import { constructEvaluationFiltersQuery } from "~/server/utils/constructEvaluationFiltersQuery";
import { constructLoggedCallFiltersQuery } from "~/server/utils/constructLoggedCallFiltersQuery";
import { prepareDatasetEntriesForImport } from "~/server/utils/datasetEntryCreation/prepareDatasetEntriesForImport";
import {
  ORIGINAL_MODEL_ID,
  typedDatasetEntry,
  typedFineTune,
  typedLoggedCall,
} from "~/types/dbColumns.types";
import { SortOrder, filtersSchema, toolsInput } from "~/types/shared.types";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { isComparisonModel } from "~/utils/comparisonModels";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { truthyFilter } from "~/utils/utils";
import {
  typedNode,
  DEFAULT_MAX_OUTPUT_SIZE,
  relabelOptions,
  typedNodeData,
} from "~/server/utils/nodes/node.types";
import { prepareIntegratedDatasetCreation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";
import { prepareArchiveCreation } from "~/server/utils/nodes/nodeCreation/prepareNodeCreation";
import { generateImportId } from "~/server/utils/nodes/importId";
import { hashDatasetEntryInput, hashDatasetEntryOutput } from "~/server/utils/nodes/hashNode";
import { processNode } from "~/server/tasks/nodes/processNode.task";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";
import { updateDatasetPruningRuleMatches } from "~/server/utils/nodes/processNodes/updatePruningRuleMatches";
import { startDatasetTestJobs } from "~/server/utils/nodes/processNodes/startTestJobs";

export const nodeDataRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        filters: filtersSchema,
        page: z.number(),
        pageSize: z.number(),
        sortOrder: z
          .object({
            field: z.enum(["createdAt", "split", "inputTokens", "outputTokens"]),
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

      const baseQuery = constructNodeDataFiltersQuery({ filters, datasetNodeId: nodeId });

      let entriesQuery = baseQuery
        .select([
          "nd.id as id",
          "nd.split as split",
          "nd.importId as importId",
          "nd.createdAt as createdAt",
          "nd.updatedAt as updatedAt",
          "dei.messages as messages",
          "dei.inputTokens as inputTokens",
          "deo.output as output",
          "deo.outputTokens as outputTokens",
        ])
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      if (input.sortOrder) {
        let orderByField: "nd.createdAt" | "nd.split" | "dei.inputTokens" | "deo.outputTokens";
        if (input.sortOrder.field === "createdAt") {
          orderByField = "nd.createdAt";
        } else if (input.sortOrder.field === "split") {
          orderByField = "nd.split";
        } else if (input.sortOrder.field === "inputTokens") {
          orderByField = "dei.inputTokens";
        } else {
          orderByField = "deo.outputTokens";
        }

        entriesQuery = entriesQuery.orderBy(orderByField, input.sortOrder.order);
      } else {
        entriesQuery = entriesQuery.orderBy("nd.importId", "desc");
      }

      const entries = await entriesQuery.orderBy("inputHash").execute();

      const matchingTrainingCount = await baseQuery
        .where("nd.split", "=", "TRAIN")
        .select((eb) => [eb.fn.count("nd.id").as("count")])
        .executeTakeFirst()
        .then((result) => parseInt(result?.count as string));

      const totalTestingCount = await prisma.datasetEntry.count({
        where: {
          datasetId: datasetId,
          outdated: false,
          split: "TEST",
        },
      });

      return {
        entries,
        matchingTrainingCount,
        totalTestingCount,
      };
    }),
  get: protectedProcedure
    .input(z.object({ id: z.string(), datasetId: z.string() }))
    .query(async ({ input, ctx }) => {
      const nodeData = await kysely
        .selectFrom("NodeData as nd")
        .where("nd.id", "=", input.id)
        .innerJoin("Node as n", "n.id", "nd.nodeId")
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.outputHash")
        .selectAll("nd")
        .select((eb) => [
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
              .whereRef("prm.inputHash", "=", "nd.inputHash")
              .innerJoin("PruningRule as pr", "pr.id", "prm.pruningRuleId")
              .where("pr.datasetId", "=", input.datasetId)
              .select(["pr.textToMatch", "pr.tokensInText"]),
          ).as("pruningRuleMatches"),
        ])
        .executeTakeFirst();

      if (!nodeData) {
        throw new TRPCError({ message: "Node data not found", code: "NOT_FOUND" });
      }

      await requireCanViewProject(nodeData.projectId, ctx);

      return typedDatasetEntry(nodeData);
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
      let llmRelabelNodeId;
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
        llmRelabelNodeId = tDatasetNode.config.llmRelabelNodeId;
      } else if (input.newDatasetParams) {
        projectId = input.newDatasetParams.projectId;

        const preparedIntegratedDatasetCreation = prepareIntegratedDatasetCreation({
          projectId,
          datasetName: input.newDatasetParams.name,
        });

        datasetId = preparedIntegratedDatasetCreation.datasetId;
        llmRelabelNodeId = preparedIntegratedDatasetCreation.llmRelabelNodeId;

        prismaCreations.push(...preparedIntegratedDatasetCreation.prismaCreations);
      } else {
        return error("No datasetId or newDatasetParams provided");
      }

      const preparedArchiveCreation = prepareArchiveCreation({
        nodeParams: {
          projectId,
          name: "Logged Calls Import",
          config: {
            maxOutputSize: DEFAULT_MAX_OUTPUT_SIZE,
          },
        },
      });

      prismaCreations.push(
        ...preparedArchiveCreation.prismaCreations,
        prisma.dataChannel.create({
          data: {
            originId: preparedArchiveCreation.entriesOutputId,
            destinationId: llmRelabelNodeId,
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

      const importedAt = new Date().toISOString();

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
              importId: generateImportId({
                uniquePrefix: `${importedAt}-${index}`,
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

      const { datasetEntryInputsToCreate, datasetEntryOutputsToCreate, nodeDataToCreate } =
        prepareDatasetEntriesForImport({
          projectId,
          nodeId: preparedArchiveCreation.archiveNodeId,
          dataChannelId: preparedArchiveCreation.inputChannelId,
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
        prisma.nodeData.createMany({
          data: nodeDataToCreate,
          skipDuplicates: true,
        }),
      ]);

      await countDatasetEntryTokens.enqueue();

      return success({ datasetId, importedAt });
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
      const nodeData = await kysely
        .selectFrom("NodeData as nd")
        .where("nd.id", "=", input.id)
        .innerJoin("NodeData as parentNodeData", "parentNodeData.id", "nd.parentNodeDataId")
        .innerJoin("DatasetEntryInput as dei", "dei.hash", "nd.inputHash")
        .innerJoin("DatasetEntryOutput as deo", "deo.hash", "nd.outputHash")
        .selectAll("nd")
        .select((eb) => [
          "parentNodeData.inputHash as parentNodeDataInputHash",
          "dei.messages as messages",
          "dei.tool_choice as tool_choice",
          "dei.tools as tools",
          "dei.response_format as response_format",
          "deo.output as output",
          jsonObjectFrom(
            eb
              .selectFrom("Node as n")
              .where("n.id", "=", "nd.nodeId")
              .innerJoin("Dataset as d", "d.nodeId", "n.id")
              .select(["n.projectId", "n.id", "n.type", "n.config", "n.hash", "d.id as datasetId"]),
          ).as("node"),
        ])
        .executeTakeFirst();

      if (!nodeData?.node) return error("NodeData not found");

      const tNode = typedNode(nodeData.node);
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

      const updatedSplit = input.updates.split ?? nodeData.split;
      const splitUpdated = updatedSplit !== nodeData.split;

      if (splitUpdated || updatedMessages || updatedTools || updatedOutput) {
        nodeData.messages = updatedMessages ?? nodeData.messages;
        nodeData.tools = updatedTools ?? nodeData.tools;
        nodeData.output = updatedOutput ?? nodeData.output;

        let tNodeData;
        try {
          tNodeData = typedNodeData(nodeData);
        } catch (e) {
          return error("Error parsing updates");
        }

        const updatedInputHash = hashDatasetEntryInput({
          ...tNodeData,
          projectId: tNode.projectId,
          tools: tNodeData.tools ?? undefined,
        });
        const inputUpdated = updatedInputHash !== tNodeData.inputHash;
        if (inputUpdated) {
          await kysely
            .insertInto("DatasetEntryInput")
            .values({
              tool_choice: JSON.stringify(tNodeData.tool_choice),
              tools: JSON.stringify(tNodeData.tools),
              messages: JSON.stringify(tNodeData.messages),
              response_format: JSON.stringify(tNodeData.response_format),
              inputTokens: 0,
              hash: updatedInputHash,
            })
            .onConflict((oc) => oc.columns(["hash"]).doNothing())
            .executeTakeFirst();
        }

        const updatedOutputHash = hashDatasetEntryOutput({
          ...tNodeData,
          projectId: tNode.projectId,
        });
        const outputUpdated = updatedOutputHash !== tNodeData.outputHash;
        if (outputUpdated) {
          await kysely
            .insertInto("DatasetEntryOutput")
            .values({
              output: JSON.stringify(tNodeData.output),
              outputTokens: 0,
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

          await kysely
            .insertInto("CachedProcessedNodeData")
            .values({
              id: uuidv4(),
              nodeHash: manualRelabelNode.hash,
              importId: nodeData.importId,
              incomingDEIHash: nodeData.parentNodeDataInputHash,
              outgoingDEIHash: updatedInputHash,
              outgoingDEOHash: updatedOutputHash,
              outgoingSplit: updatedSplit,
              updatedAt: new Date(),
            })
            .onConflict((oc) =>
              oc.columns(["nodeHash", "importId", "incomingDEIHash"]).doUpdateSet({
                updatedAt: new Date(),
                outgoingDEIHash: updatedInputHash,
                outgoingDEOHash: updatedOutputHash,
              }),
            )
            .execute();

          const parentNodeDataId = tNodeData.parentNodeDataId;

          // delete all NodeData downstream of the ManualRelabel and Dataset NodeData
          // (excluding the NodeData that we're editing)
          await kysely
            .deleteFrom("NodeData")
            .where((eb) =>
              eb.or([
                eb("parentNodeDataId", "=", parentNodeDataId),
                eb("parentNodeDataId", "=", input.id),
              ]),
            )
            .where("id", "!=", input.id)
            .execute();

          // Tell ManualRelabel Node to reprocess the NodeData
          await kysely
            .updateTable("NodeData")
            .where("nodeId", "=", manualRelabelNode.id)
            .where("importId", "=", tNodeData.importId)
            .set({
              status: "PENDING",
              updatedAt: new Date(),
            })
            .execute();

          // Update the NodeData directly in the Dataset Node
          await kysely
            .updateTable("NodeData")
            .where("id", "=", tNodeData.id)
            .set({
              inputHash: updatedInputHash,
              outputHash: updatedOutputHash,
              split: updatedSplit,
              updatedAt: new Date(),
            })
            .execute();

          await processNode.enqueue({ nodeId: manualRelabelNode.id, nodeType: "ManualRelabel" });
          await countDatasetEntryTokens.enqueue();

          await updateDatasetPruningRuleMatches({
            nodeHash: tNode.hash,
            datasetId: tNode.datasetId,
            nodeDataBaseQuery: kysely
              .selectFrom("NodeData as nd")
              .where("nd.nodeId", "=", input.id),
          });
          if (updatedSplit === "TEST") {
            await startDatasetTestJobs({
              datasetId: tNode.datasetId,
              nodeDataBaseQuery: kysely
                .selectFrom("NodeData as nd")
                .where("nd.nodeId", "=", input.id),
            });
          }
        }
      }

      return success("Update complete");
    }),

  updateRelabelModel: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        relabelLLM: z.enum(relabelOptions),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { datasetId, relabelLLM } = input;

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
        include: {
          node: true,
        },
      });

      if (!dataset || !dataset.node) return error("Dataset not found");

      await requireCanModifyProject(dataset.projectId, ctx);

      const tNode = typedNode(dataset.node);

      if (tNode.type !== "Dataset") return error("Dataset node not found");

      const llmRelabelNode = await prisma.node.findUnique({
        where: {
          id: tNode.config.llmRelabelNodeId,
        },
      });

      if (!llmRelabelNode) return error("Unable to find LLM Relabel Node");

      const tLLMRelabelNode = typedNode(llmRelabelNode);

      if (tLLMRelabelNode.type !== "LLMRelabel") return error("LLM Relabel node not found");

      await prisma.node.update({
        where: {
          id: tNode.id,
        },
        data: checkNodeInput({
          ...tLLMRelabelNode,
          config: {
            ...tLLMRelabelNode.config,
            relabelLLM,
          },
        }),
      });

      await processNode.enqueue({
        nodeId: tLLMRelabelNode.id,
        nodeType: "LLMRelabel",
        invalidateData: true,
      });

      return success("Relabel model updated");
    }),

  listTestingNodeData: protectedProcedure
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

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: datasetId,
        },
        include: {
          node: true,
        },
      });

      if (!dataset) throw new TRPCError({ message: "Dataset not found", code: "NOT_FOUND" });
      await requireCanViewProject(dataset.projectId, ctx);

      if (!dataset.node)
        throw new TRPCError({ message: "Dataset node not found", code: "NOT_FOUND" });

      const baseQuery = constructEvaluationFiltersQuery({ filters, nodeId: dataset.node.id });

      let updatedQuery = baseQuery;

      if (sortOrder) {
        updatedQuery = updatedQuery
          .leftJoin(
            (eb) =>
              eb
                .selectFrom("DatasetEvalDatasetEntry as dede")
                .where("dede.datasetEvalId", "=", sortOrder.evalId)
                .leftJoin(
                  (eb) =>
                    eb
                      .selectFrom("DatasetEvalResult as der")
                      .innerJoin(
                        "DatasetEvalOutputSource as comparisonDeos",
                        "comparisonDeos.id",
                        "der.comparisonOutputSourceId",
                      )
                      .where("comparisonDeos.modelId", "in", visibleModelIds)
                      .selectAll("der")
                      .as("der"),
                  (join) => join.onRef("der.datasetEvalDatasetEntryId", "=", "dede.id"),
                )
                .leftJoin(
                  "DatasetEvalOutputSource as deos",
                  "deos.id",
                  "der.datasetEvalOutputSourceId",
                )
                .where("deos.modelId", "=", sortOrder.modelId)
                .select((eb) => [
                  "dede.importId as dedeImportId",
                  eb.fn.agg<number>("AVG", [`der.score`]).as("score"),
                ])
                .groupBy("dede.importId")
                .as("averageScoreForEval"),
            (join) => join.onRef("averageScoreForEval.dedeImportId", "=", "nd.importId"),
          )
          // Ensure that rows with the sort eval applied are always shown first
          .orderBy(
            () =>
              sql`CASE
                WHEN "averageScoreForEval"."inputHash" IS NULL THEN 1
                ELSE 0
              END`,
          )
          .orderBy(`averageScoreForEval.score`, sortOrder.order);
      }

      const entries = await updatedQuery
        .select((eb) => [
          "nd.id as id",
          "dei.messages as messages",
          "dei.response_format as response_format",
          "deo.output as output",
          jsonArrayFrom(
            eb
              .selectFrom("FineTuneTestingEntry as ftte")
              .select([
                "id",
                "ftte.modelId",
                "output",
                "score",
                "errorMessage",
                "finishReason",
                "inputTokens",
                "outputTokens",
              ])
              .whereRef("ftte.inputHash", "=", "nd.inputHash")
              .where("ftte.modelId", "in", visibleModelIds),
          ).as("fineTuneTestDatasetEntries"),
          jsonArrayFrom(
            eb
              .selectFrom("DatasetEvalResult as der")
              .leftJoin("DatasetEvalDatasetEntry as dede", "dede.importId", "nd.importId")
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
              .whereRef("der.datasetEvalDatasetEntryId", "=", "dede.id")
              .where((eb) =>
                eb.or([
                  eb("der.comparisonOutputSourceId", "is", null),
                  eb("comparisonDeos.modelId", "in", visibleModelIds),
                ]),
              ),
          ).as("datasetEvalResults"),
        ])
        .orderBy("nd.importId", "desc")
        .orderBy("nd.inputHash", "desc")
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .execute();

      const count = await baseQuery
        .select([sql<number>`count(*)::int`.as("count")])
        .executeTakeFirst()
        .then((res) => res?.count ?? 0);

      const pageIncomplete = entries.some(
        (entry) =>
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
        .selectFrom("FineTuneTestingEntry as ftte")
        .innerJoin("NodeData as nd", (join) =>
          join
            .on("nd.nodeId", "=", dataset.nodeId)
            .onRef("nd.inputHash", "=", "ftte.inputHash")
            .on("nd.split", "=", "TEST")
            .on("nd.status", "=", "PROCESSED"),
        )
        .distinctOn(["nd.importId", "nd.inputHash"])
        .where("ftte.modelId", "=", modelId)
        .where(sql`"ftte"."output" is not null`)
        .select([sql<number>`count(*)::int`.as("count")])
        .execute();

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
                .selectFrom(`DatasetEvalDatasetEntry as dede`)
                .where("dede.datasetEvalId", "=", datasetEval.id)
                .leftJoin("DatasetEvalResult as der", "der.datasetEvalDatasetEntryId", "dede.id")
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
                  "dede.importId as importId",
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
                .groupBy(["dede.importId"])
                .as(alias),
            (join) => join.onRef(`${alias}.importId`, "=", "nd.importId"),
          )
          .select((eb) => [
            eb.fn.agg<number>("AVG", [`${alias}.scoreForEval`]).as(`score_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.wins) AS INT)`).as(`totalWins_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.ties) AS INT)`).as(`totalTies_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.losses) AS INT)`).as(`totalLosses_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.pending) AS INT)`).as(`totalPending_${datasetEval.id}`),
            sql.raw(`CAST(SUM(${alias}.complete) AS INT)`).as(`totalComplete_${datasetEval.id}`),
            sql.raw(`CAST(COUNT(${alias}."importId") AS INT)`).as(`totalCount_${datasetEval.id}`),
          ]) as unknown as typeof baseQuery;
      }

      const performance = await updatedPerformanceQuery
        .select("nd.nodeId")
        .groupBy("nd.nodeId")
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
        finishedCount: finishedCount.length,
        evalPerformances,
        resultsPending,
      };
    }),
});
