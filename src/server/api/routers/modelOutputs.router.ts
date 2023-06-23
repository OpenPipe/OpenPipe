import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import fillTemplate, { JSONSerializable, VariableMap } from "~/server/utils/fillTemplate";
import { getChatCompletion } from "~/server/utils/openai";

export const modelOutputsRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ scenarioId: z.string(), variantId: z.string() }))
    .query(async ({ input }) => {
      const existing = await prisma.modelOutput.findUnique({
        where: {
          promptVariantId_testScenarioId: {
            promptVariantId: input.variantId,
            testScenarioId: input.scenarioId,
          },
        },
      });

      if (existing) return existing;

      const variant = await prisma.promptVariant.findUnique({
        where: {
          id: input.variantId,
        },
      });

      const scenario = await prisma.testScenario.findUnique({
        where: {
          id: input.scenarioId,
        },
      });

      if (!variant || !scenario) return null;

      const filledTemplate = fillTemplate(
        variant.config as JSONSerializable,
        scenario.variableValues as VariableMap
      );

      const modelResponse = await getChatCompletion(filledTemplate, process.env.OPENAI_API_KEY!);

      const modelOutput = await prisma.modelOutput.create({
        data: {
          promptVariantId: input.variantId,
          testScenarioId: input.scenarioId,
          output: modelResponse,
        },
      });

      return modelOutput;
    }),
});
