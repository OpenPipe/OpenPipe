import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanModifyProject } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { relabelOptions, typedNode } from "~/server/utils/nodes/node.types";
import { enqueueProcessNode } from "~/server/tasks/nodes/processNodes/processNode.task";
import { checkNodeInput } from "~/server/utils/nodes/checkNodeInput";

export const archivesRouter = createTRPCRouter({
  updateRelabelingModel: protectedProcedure
    .input(
      z.object({
        archiveLLMRelabelNodeId: z.string(),
        relabelOption: z.enum(relabelOptions),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const llmRelabelNode = await kysely
        .selectFrom("Node as n")
        .where("n.id", "=", input.archiveLLMRelabelNodeId)
        .selectAll("n")
        .executeTakeFirst();

      if (!llmRelabelNode) return error("Relabeling model not found");

      await requireCanModifyProject(llmRelabelNode.projectId, ctx);

      const tLlmRelabelNode = typedNode({ ...llmRelabelNode, type: "LLMRelabel" });

      if (tLlmRelabelNode.config.relabelLLM === input.relabelOption)
        return success("Archive relabeling model already set to this option");

      await prisma.node.update({
        where: { id: tLlmRelabelNode.id },
        data: checkNodeInput({
          ...tLlmRelabelNode,
          config: {
            ...tLlmRelabelNode.config,
            relabelLLM: input.relabelOption,
          },
        }),
      });

      await enqueueProcessNode({
        nodeId: tLlmRelabelNode.id,
        invalidateData: true,
      });

      return success("Archive relabeling model updated");
    }),
});
