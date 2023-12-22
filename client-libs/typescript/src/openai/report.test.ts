import dotenv from "dotenv";
import { test } from "vitest";
import OpenAI from "../openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { OPClient } from "../codegen";

dotenv.config();

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: process.env.OPENPIPE_API_KEY,
    baseUrl: "http://localhost:3000/api/v1",
  },
});

const opClient = new OPClient({
  BASE: "http://localhost:3000/api/v1",
  TOKEN: process.env.OPENPIPE_API_KEY,
});

test("reports null response payload", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const resp = await opClient.default.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      promptId: "reports null response payload",
    },
  });
});

test("reports invalid request payload", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const completionResp = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: {
        promptId: "reports invalid request payload",
      },
    },
  });
});
