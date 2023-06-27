import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import fillTemplate, { type VariableMap } from "~/server/utils/fillTemplate";
import { type JSONSerializable } from "~/server/types";
import { getChatCompletion } from "~/server/utils/openai";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { env } from "~/env.mjs";

env;

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

      const inputHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(filledTemplate))
        .digest("hex");

      // TODO: we should probably only use this if temperature=0
      const existingResponse = await prisma.modelOutput.findFirst({
        where: { inputHash },
      });

      let modelResponse: JSONSerializable;

      if (existingResponse) {
        modelResponse = existingResponse.output as JSONSerializable;
      } else {
        modelResponse = await getChatCompletion(filledTemplate, env.OPENAI_API_KEY);
      }

      const modelOutput = await prisma.modelOutput.create({
        data: {
          promptVariantId: input.variantId,
          testScenarioId: input.scenarioId,
          output: modelResponse as Prisma.InputJsonObject,
          inputHash,
        },
      });

      return modelOutput;
    }),
});
