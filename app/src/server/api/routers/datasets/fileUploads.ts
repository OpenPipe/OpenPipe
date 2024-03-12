import { z } from "zod";

import { kysely, prisma } from "~/server/db";
import { protectedProcedure } from "../../trpc";
import { requireCanViewProject, requireCanModifyProject } from "~/utils/accessControl";
import { typedNode } from "~/server/utils/nodes/node.types";
import { getArchives } from "~/server/utils/nodes/relationalQueries";
import { error } from "~/utils/errorHandling/standardResponses";

export const listFileUploads = protectedProcedure
  .input(z.object({ datasetId: z.string() }))
  .query(async ({ input, ctx }) => {
    const datasetNode = await kysely
      .selectFrom("Dataset as d")
      .where("d.id", "=", input.datasetId)
      .innerJoin("Node as n", "n.id", "d.nodeId")
      .select(["n.projectId", "n.type", "n.config"])
      .executeTakeFirst();

    if (!datasetNode) {
      throw new Error("Node not found");
    }

    await requireCanViewProject(datasetNode.projectId, ctx);

    const tNode = typedNode({ ...datasetNode, type: "Dataset" });

    const archives = await getArchives({
      datasetManualRelabelNodeId: tNode.config.manualRelabelNodeId,
    })
      .select(["archiveNode.id as archiveNodeId"])
      .execute();

    if (!archives.length) return [];

    return await prisma.datasetFileUpload.findMany({
      where: {
        nodeId: {
          in: archives.map((a) => a.archiveNodeId),
        },
        visible: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

export const hideFileUploads = protectedProcedure
  .input(z.object({ fileUploadIds: z.string().array() }))
  .mutation(async ({ input, ctx }) => {
    if (!input.fileUploadIds.length) return error("No file upload ids provided");

    const { node } = await prisma.datasetFileUpload.findUniqueOrThrow({
      where: { id: input.fileUploadIds[0] },
      select: {
        node: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });

    if (!node) return error("Node not found");

    await requireCanModifyProject(node.projectId, ctx);

    await prisma.datasetFileUpload.updateMany({
      where: {
        id: {
          in: input.fileUploadIds,
        },
      },
      data: {
        visible: false,
      },
    });
  });
