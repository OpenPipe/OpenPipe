import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { reevaluateVariant } from "~/server/utils/evaluations";
import { getCompletion } from "~/server/utils/getCompletion";
import { constructPrompt } from "~/server/utils/constructPrompt";

export const modelOutputsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        scenarioId: z.string(),
        variantId: z.string(),
        channel: z.string().optional(),
        forceRefetch: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.modelOutput.findUnique({
        where: {
          promptVariantId_testScenarioId: {
            promptVariantId: input.variantId,
            testScenarioId: input.scenarioId,
          },
        },
      });

      if (existing && !input.forceRefetch) return existing;

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

      const prompt = await constructPrompt(variant, scenario);

      const inputHash = crypto.createHash("sha256").update(JSON.stringify(prompt)).digest("hex");

      // TODO: we should probably only use this if temperature=0
      const existingResponse = await prisma.modelOutput.findFirst({
        where: { inputHash, errorMessage: null },
      });

      let modelResponse: Awaited<ReturnType<typeof getCompletion>>;

      if (existingResponse) {
        modelResponse = {
          output: existingResponse.output as Prisma.InputJsonValue,
          statusCode: existingResponse.statusCode,
          errorMessage: existingResponse.errorMessage,
          timeToComplete: existingResponse.timeToComplete,
          promptTokens: existingResponse.promptTokens ?? undefined,
          completionTokens: existingResponse.completionTokens ?? undefined,
        };
      } else {
        try {
          modelResponse = await getCompletion(prompt, input.channel);
        } catch (e) {
          console.error(e);
          throw e;
        }
      }

      const modelOutput = await prisma.modelOutput.upsert({
        where: {
          promptVariantId_testScenarioId: {
            promptVariantId: input.variantId,
            testScenarioId: input.scenarioId,
          },
        },
        create: {
          promptVariantId: input.variantId,
          testScenarioId: input.scenarioId,
          inputHash,
          ...modelResponse,
        },
        update: {
          ...modelResponse,
        },
      });

      await reevaluateVariant(input.variantId);

      return modelOutput;
    }),
});
