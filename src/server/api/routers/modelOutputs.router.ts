import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { fillTemplateJson, type VariableMap } from "~/server/utils/fillTemplate";
import { type JSONSerializable } from "~/server/types";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { reevaluateVariant } from "~/server/utils/evaluations";
import { getCompletion } from "~/server/utils/getCompletion";

export const modelOutputsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({ scenarioId: z.string(), variantId: z.string(), channel: z.string().optional() })
    )
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

      const filledTemplate = fillTemplateJson(
        variant.config as JSONSerializable,
        scenario.variableValues as VariableMap
      );

      const inputHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(filledTemplate))
        .digest("hex");

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
        modelResponse = await getCompletion(filledTemplate, input.channel);
      }

      const modelOutput = await prisma.modelOutput.create({
        data: {
          promptVariantId: input.variantId,
          testScenarioId: input.scenarioId,
          inputHash,
          ...modelResponse,
        },
      });

      await reevaluateVariant(input.variantId);

      return modelOutput;
    }),
});
