import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { JSONSerializable, OpenAIChatConfig } from "~/server/types";

export const promptVariantsRouter = createTRPCRouter({
  list: publicProcedure.input(z.object({ experimentId: z.string() })).query(async ({ input }) => {
    return await prisma.promptVariant.findMany({
      where: {
        experimentId: input.experimentId,
        visible: true,
      },
      orderBy: {
        sortIndex: "asc",
      },
    });
  }),

  replaceWithConfig: publicProcedure
    .input(
      z.object({
        id: z.string(),
        config: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.promptVariant.findUnique({
        where: {
          id: input.id,
        },
      });

      console.log("got existing", existing);
      console.log("config", input.config);

      let parsedConfig;
      try {
        parsedConfig = JSON.parse(input.config) as OpenAIChatConfig;
      } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
      }

      if (!existing) {
        throw new Error(`Prompt Variant with id ${input.id} does not exist`);
      }

      // Create a duplicate with only the config changed
      const newVariant = await prisma.promptVariant.create({
        data: {
          experimentId: existing.experimentId,
          label: existing.label,
          sortIndex: existing.sortIndex,
          config: parsedConfig,
        },
      });

      await prisma.promptVariant.update({
        where: {
          id: input.id,
        },
        data: {
          visible: false,
        },
      });

      return newVariant;
    }),
});
