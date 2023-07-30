import { type Prisma } from "@prisma/client";
import { type JsonObject } from "type-fest";
import { z } from "zod";
import modelProviders from "~/modelProviders/modelProviders";
import { type SupportedProvider } from "~/modelProviders/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import hashSortedObject, { hashString } from "~/server/utils/hashSortedObject";

export const externalApiRouter = createTRPCRouter({
  capturePrompt: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/capture-prompt",
        description: "Capture a prompt with its variables call",
      },
    })
    .input(
      z.object({
        apiKey: z.string().describe("API token for authentication"),
        dataFlowId: z.string().describe("Data flow ID"),
        promptFunction: z.string().describe("Prompt construction function"),
        scenarioVariables: z.unknown().describe("Scenario variables as JSON"),
        prompt: z.unknown().describe("Prompt object as JSON"),
        model: z.string().describe("Model name"), 
        modelProvider: z.string().describe("Model provider"),
      }),
    )
    .output(z.string())
    .mutation(async ({ input }) => {
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: input.apiKey },
      });
      if (!apiKey) {
        throw new Error("Invalid API token");
      }
      const dataFlow = await prisma.dataFlow.findUnique({
        where: { id: input.dataFlowId },
      });
      if (!dataFlow) {
        throw new Error("Invalid data flow ID");
      }

      const loggedCall = await prisma.loggedCall.create({
        data: {
          dataFlowId: input.dataFlowId,
          promptFunctionHash: hashString(input.promptFunction),
          // Pass the constructor function and the parsed values here since
          // we want to let the user change the constructor function for all scenarios
          promptFunction: input.promptFunction,
          scenarioVariables: input.scenarioVariables as Prisma.InputJsonValue,
          model: input.model,
          modelProvider: input.modelProvider,
          prompt: input.prompt as Prisma.InputJsonValue,
        },
      });
      return loggedCall.id;
    }),
  captureResponse: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/capture-response",
        description: "Capture a response to a prompt",
      },
    })
    .input(
      z.object({
        apiKey: z.string().describe("API token for authentication"),
        loggedCallId: z.string().describe("Logged call ID"),
        responsePayload: z.unknown().describe("JSON-encoded response payload"),
      }),
    )
    .output(z.void())
    .mutation(async ({ input }) => {
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: input.apiKey },
      });
      if (!apiKey) {
        throw new Error("Invalid API token");
      }
      const loggedCall = await prisma.loggedCall.findUnique({
        where: { id: input.loggedCallId },
      });
      if (!loggedCall) {
        throw new Error("Invalid call log ID");
      }

      await prisma.loggedCall.update({
        where: { id: input.loggedCallId },
        data: {
          responsePayload: input.responsePayload as Prisma.InputJsonValue,
        },
      });

      const modelProvider = modelProviders[loggedCall.modelProvider as SupportedProvider];

      const inputHash = hashSortedObject(loggedCall.prompt as JsonObject);

      await prisma.modelResponse.create({
        data: {
          inputHash,
          loggedCallId: input.loggedCallId,
          output: modelProvider.normalizeOutput(input.responsePayload),
          // TODO: get more accurate time values
          requestedAt: loggedCall.createdAt,
          receivedAt: new Date(),
          statusCode: 200,
        },
      });
    }),
});
