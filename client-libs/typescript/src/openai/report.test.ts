import { test } from "vitest";
import OpenAI from "../openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { OPClient } from "../codegen";
import { OPENPIPE_API_KEY, OPENPIPE_API_URL } from "./setup";

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: OPENPIPE_API_KEY,
    baseUrl: OPENPIPE_API_URL,
  },
});

const opClient = new OPClient({
  BASE: OPENPIPE_API_URL,
  TOKEN: OPENPIPE_API_KEY,
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

test("reports unusual tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const completionResp = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: {
        promptId: "reports unusual tags",
        numberTag: 1,
        booleanTag: true,
        nullTag: null,
      },
    },
  });
});
