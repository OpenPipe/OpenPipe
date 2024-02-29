import dotenv from "dotenv";
import { expect, test } from "vitest";
import BaseOpenAI, { APIError } from "openai";
import { sleep } from "openai/core";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions";
import assert from "assert";

import OpenAI from "../openai";
import { OPClient } from "../codegen";
import mergeChunks from "./mergeChunks";
import { getTags } from "../shared";
import { OPENPIPE_API_KEY, OPENPIPE_BASE_URL, TEST_LAST_LOGGED } from "../testConfig";
import { functionBody } from "../sharedTestInput";

dotenv.config();

const baseClient = new BaseOpenAI({
  apiKey: OPENPIPE_API_KEY,
  baseURL: OPENPIPE_BASE_URL,
});

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: OPENPIPE_API_KEY,
    baseUrl: OPENPIPE_BASE_URL,
  },
});

const opClient = new OPClient({
  BASE: OPENPIPE_BASE_URL,
  TOKEN: OPENPIPE_API_KEY,
});

const lastLoggedCall = async () => opClient.default.localTestingOnlyGetLatestLoggedCall();

const randomLetters = Math.random().toString(36).substring(7);

test("simple ft tool call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
  };
  const completion = await oaiClient.chat.completions.create(payload);
  console.log(completion.choices[0].message);
  await sleep(100);
  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
    expect(completion).toMatchObject(lastLogged?.respPayload);
  }
}, 100000);

test("content streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "openpipe:test-content-mistral-p3",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    console.log(chunk.choices[0]?.delta);
    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe?.reportingFinished;
  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject([
      { role: "system", content: "count to 3" },
    ]);
  }
});

test.only("tool call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:pink-mirrors-hang",
    // model: "openpipe:test-tool-calls-mistral-p3-uni",
    // model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Weather in Seattle" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
    n: 1,
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: { promptId: "tool call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  let isFirstChunk = true;
  let isFirstFunctionChunk = true;

  for await (const chunk of completion) {
    console.log(chunk.choices[0]?.delta.tool_calls);
    validateOpenAIChunkSignature(chunk);

    if (isFirstChunk) {
      validateOpenAIToolCallDeltaFirstChunkSignature(chunk.choices[0]?.delta);
      isFirstChunk = false;
    }

    if (chunk.choices[0]?.delta?.tool_calls) {
      validateOpenAIToolCallDeltaSignature(chunk.choices[0]?.delta, isFirstFunctionChunk);
      isFirstFunctionChunk = false;
    }

    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe?.reportingFinished;

  await sleep(100);
  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
}, 200000);

function validateOpenAIChunkSignature(chunk: any) {
  expect(chunk).toHaveProperty("id");
  expect(chunk.object).toEqual("chat.completion.chunk");
  expect(chunk).toHaveProperty("created");
  expect(chunk).toHaveProperty("model");
  expect(chunk).toHaveProperty("choices");
  expect(Array.isArray(chunk.choices)).toBeTruthy();
  chunk.choices.forEach((choice: Record<string, any>) => {
    expect(choice).toHaveProperty("index");
    expect(choice).toHaveProperty("delta");
    expect(choice).toHaveProperty("logprobs");
    expect([
      "stop",
      "length",
      "tool_calls",
      "content_filter",
      "function_call",
      null,
    ]).toContainEqual(choice.finish_reason);
  });
}

function validateOpenAIToolCallDeltaFirstChunkSignature(chunk: any) {
  //   expect(chunk).toHaveProperty("role");
  //   expect(chunk).toHaveProperty("content");
}

function validateOpenAIToolCallDeltaSignature(chunk: any, isFirst: boolean) {
  expect(chunk).toHaveProperty("tool_calls");
  if (isFirst) {
    expect(Array.isArray(chunk.tool_calls)).toBe(true);
    chunk.tool_calls.forEach((call: any) => {
      expect(call).toHaveProperty("index");
      expect(call).toHaveProperty("id");
      expect(typeof call.id).toBe("string");
      expect(call).toHaveProperty("type");
      expect(call.type).toBe("function");
      expect(call).toHaveProperty("function");
      expect(typeof call.function).toBe("object");
    });
  } else {
    chunk.tool_calls.forEach((call: any) => {
      expect(call).toHaveProperty("index");
      expect(call).toHaveProperty("function");
      expect(typeof call.function).toBe("object");
      expect(call.function).toHaveProperty("arguments");
      expect(typeof call.function.arguments).toBe("string");
    });
  }
}
