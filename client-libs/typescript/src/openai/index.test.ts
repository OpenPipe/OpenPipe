import dotenv from "dotenv";
import { expect, test } from "vitest";
import BaseOpenAI from "openai";
import { sleep } from "openai/core";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions";
import assert from "assert";

import OpenAI from "../openai";
import { OPClient } from "../codegen";
import mergeChunks from "./mergeChunks";

dotenv.config();

// const BASE_URL = "https://app.openpipe.ai/api/v1";
// const BASE_URL = "https://app.openpipestage.com/api/v1";
const BASE_URL = "http://localhost:3000/api/v1";

const baseClient = new BaseOpenAI({
  apiKey: process.env.OPENPIPE_API_KEY,
  baseURL: BASE_URL,
});

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: process.env.OPENPIPE_API_KEY,
    baseUrl: BASE_URL,
  },
});

const opClient = new OPClient({
  BASE: BASE_URL,
  TOKEN: process.env.OPENPIPE_API_KEY,
});

const functionCall = { name: "get_current_weather" };
const functionBody = {
  name: "get_current_weather",
  description: "Get the current weather in a given location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city and state, e.g. San Francisco, CA",
      },
      unit: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
      },
    },
    required: ["location"],
  },
};

const lastLoggedCall = async () => opClient.default.localTestingOnlyGetLatestLoggedCall();

test("simple openai content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: { tags: { promptId: "simple openai content call" } },
  });

  await completion.openpipe.reportingFinished;

  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.reqPayload).toMatchObject(payload);
  expect(completion).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.tags).toMatchObject({ promptId: "simple openai content call" });
}, 10000);

test("simple ft content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-mistral",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await oaiClient.chat.completions.create(payload);

  await sleep(100);
  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  expect(completion).toMatchObject(lastLogged?.respPayload);
}, 100000);

test("base client openai content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await baseClient.chat.completions.create(payload, {
    headers: { "op-log-request": "true" },
  });

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.reqPayload).toMatchObject(payload);
  expect(completion.id).toMatchObject(lastLogged?.respPayload.id);
}, 10000);

test("base client ft content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-mistral",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const tags = { promptId: "base client ft content call" };
  const completion = await baseClient.chat.completions.create(payload, {
    headers: {
      "op-log-request": "true",
      "op-tags": JSON.stringify(tags),
    },
  });

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.reqPayload).toMatchObject(payload);
  expect(completion.id).toMatchObject(lastLogged?.respPayload.id);
  expect(lastLogged?.tags).toMatchObject(tags);
}, 10000);

test("openai content streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject([
    { role: "system", content: "count to 3" },
  ]);
});

test("openai function call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    functions: [functionBody],
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: { promptId: "openai function call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  console.log("merged", merged?.choices[0]?.message.function_call);

  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
});

test("openai tool call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: { promptId: "openai tool call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  console.log("merged", merged?.choices[0]?.message.tool_calls);

  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
});

test("base sdk function call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    functions: [functionBody],
    stream: true,
  };
  const completion = await baseClient.chat.completions.create(
    {
      ...payload,
    },
    {
      headers: {
        "op-log-request": "true",
        "op-tags": JSON.stringify({ promptId: "base sdk function call streaming" }),
      },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  console.log("merged", merged?.choices[0]?.message.function_call);

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
});

test("base sdk tool call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
    stream: true,
  };
  const completion = await baseClient.chat.completions.create(
    {
      ...payload,
    },
    {
      headers: {
        "op-log-request": "true",
        "op-tags": JSON.stringify({ promptId: "base sdk tool call streaming" }),
      },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  console.log("merged", merged?.choices[0]?.message.tool_calls);

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
});

test("openai streaming base sdk", async () => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 4" }],
    stream: true,
  };
  const completion = await baseClient.chat.completions.create(input, {
    headers: { "op-log-request": "true" },
  });
  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject(input.messages);
}, 10000);

test("openai streaming base sdk logs request for base model", async () => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 4" }],
    stream: true,
  };
  const completion = await baseClient.chat.completions.create(input);
  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.respPayload.id).toEqual(merged?.id);
}, 10000);

test("openai streaming base sdk does not log request if asked not to", async () => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 4" }],
    stream: true,
  };
  const completion = await baseClient.chat.completions.create(input, {
    headers: { "op-log-request": "false" },
  });
  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.respPayload.id).not.toEqual(merged?.id);
}, 10000);

test("35 ft streaming", async () => {
  const completion = await baseClient.chat.completions.create(
    {
      model: "openpipe:test-content-35",
      messages: [{ role: "system", content: "count to 3" }],
      stream: true,
    },
    {
      headers: {
        "op-log-request": "true",
        "op-tags": JSON.stringify({ promptId: "35 ft streaming" }),
      },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.respPayload.id).toEqual(merged?.id);
}, 10000);

test("defaults to not recording for fine-tuned models", async () => {
  const completion = await baseClient.chat.completions.create(
    {
      model: "openpipe:test-content-35",
      messages: [{ role: "system", content: "count to 3" }],
      stream: true,
    },
    {
      headers: { "op-tags": JSON.stringify({ promptId: "should not be recorded" }) },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.respPayload.id).not.toEqual(merged?.id);
}, 10000);

test.skip("mistral ft streaming", async () => {
  const completion = await baseClient.chat.completions.create({
    model: "openpipe:test-content-mistral",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    console.log("chunk", chunk);
    merged = mergeChunks(merged, chunk);
  }

  console.log("merged message", merged?.choices[0]?.message);
}, 10000);

test("bad call streaming", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-blaster",
      messages: [{ role: "system", content: "count to 10" }],
      stream: true,
    });
  } catch (e: unknown) {
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.errorMessage).toEqual(
      "404 The model `gpt-3.5-turbo-blaster` does not exist",
    );
    expect(lastLogged?.statusCode).toEqual(404);
  }
});

test("bad call", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-buster",
      messages: [{ role: "system", content: "count to 10" }],
    });
  } catch (e: unknown) {
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.errorMessage).toEqual("404 The model `gpt-3.5-turbo-buster` does not exist");
    expect(lastLogged?.statusCode).toEqual(404);
  }
});
