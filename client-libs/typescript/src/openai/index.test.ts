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

test("simple openai content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const openpipeOptions = { tags: { promptId: "simple openai content call" } };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: openpipeOptions,
  });

  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(completion).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.tags).toMatchObject(getTags(openpipeOptions));
  }
}, 10000);

test("simple ft content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-mistral-p3",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await oaiClient.chat.completions.create(payload);

  await sleep(100);
  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
    expect(completion).toMatchObject(lastLogged?.respPayload);
  }
}, 100000);

test("simple ft tool call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-tool-calls-mistral-p3",
    messages: [{ role: "system", content: "tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
  };
  const completion = await oaiClient.chat.completions.create(payload);

  await sleep(100);
  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
    expect(completion).toMatchObject(lastLogged?.respPayload);
  }
}, 100000);

test("openai call caches", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-35",
    messages: [{ role: "system", content: `${randomLetters} count to 3` }],
  };
  await oaiClient.chat.completions.create({
    ...payload,
    openpipe: { tags: { promptId: "openai call caches (no cache)" } },
  });
  await oaiClient.chat.completions.create({
    ...payload,
    openpipe: { tags: { promptId: "openai call caches (no cache)" } },
  });

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    let lastLogged = await lastLoggedCall();

    expect(lastLogged?.cacheHit).toBe(false);

    await oaiClient.chat.completions.create({
      ...payload,
      openpipe: { cache: true, tags: { promptId: "openai call caches" } },
    });
    await sleep(100);
    await oaiClient.chat.completions.create({
      ...payload,
      openpipe: { cache: true, tags: { promptId: "openai call caches" } },
    });
    await sleep(100);

    lastLogged = await lastLoggedCall();

    expect(lastLogged?.cacheHit).toBe(true);
  }
}, 100000);

test("base sdk openai content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await baseClient.chat.completions.create(payload, {
    headers: { "op-log-request": "true" },
  });

  await sleep(100);
  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(completion.id).toMatchObject(lastLogged?.respPayload.id);
  }
}, 10000);

test("base sdk ft content call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-mistral-p3",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const tags = { promptId: "base sdk ft content call" };
  const completion = await baseClient.chat.completions.create(payload, {
    headers: {
      "op-log-request": "true",
      "op-tags": JSON.stringify(tags),
    },
  });

  await sleep(100);
  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(completion.id).toMatchObject(lastLogged?.respPayload.id);
    expect(lastLogged?.tags).toMatchObject(tags);
  }
}, 100000);

test("content streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
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

test("base sdk content streaming", async () => {
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

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(input.messages);
  }
}, 10000);

test("function call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    functions: [functionBody],
    stream: true,
  };
  const openpipeOptions = { tags: { promptId: "function call streaming" } };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: { promptId: "function call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
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

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
});

test("tool call streaming", async () => {
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
      tags: { promptId: "tool call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
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

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
});

test("logs streamed request for base model", async () => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 4" }],
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create(input);
  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);
  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).toEqual(merged?.id);
  }
}, 10000);

test("base sdk logs streamed request for base model", async () => {
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

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).toEqual(merged?.id);
  }
}, 10000);

test("does not log streamed request if asked not to", async () => {
  const input: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 4" }],
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create({
    ...input,
    openpipe: { logRequest: false },
  });
  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).not.toEqual(merged?.id);
  }
}, 10000);

test("base sdk does not log streamed request if asked not to", async () => {
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

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).not.toEqual(merged?.id);
  }
}, 10000);

test("35 ft streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "openpipe:test-content-35",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
    openpipe: { tags: { promptId: "35 ft streaming" } },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).toEqual(merged?.id);
  }
}, 10000);

test("base sdk 35 ft streaming", async () => {
  const completion = await baseClient.chat.completions.create(
    {
      model: "openpipe:test-content-35",
      messages: [{ role: "system", content: "count to 3" }],
      stream: true,
    },
    {
      headers: {
        "op-log-request": "true",
        "op-tags": JSON.stringify({ promptId: "base sdk 35 ft streaming" }),
      },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).toEqual(merged?.id);
  }
}, 10000);

test("defaults to recording for fine-tuned models", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "openpipe:test-content-35",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
    openpipe: { tags: { promptId: "should be recorded" } },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).toEqual(merged?.id);
  }
}, 10000);

test("base sdk defaults to not recording for fine-tuned models", async () => {
  const completion = await baseClient.chat.completions.create(
    {
      model: "openpipe:test-content-35",
      messages: [{ role: "system", content: "count to 3" }],
      stream: true,
    },
    {
      headers: { "op-tags": JSON.stringify({ promptId: "base sdk should not be recorded" }) },
    },
  );

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  await sleep(100);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.respPayload.id).not.toEqual(merged?.id);
  }
}, 10000);

test("mistral ft streaming", async () => {
  const completion = await baseClient.chat.completions.create({
    model: "openpipe:test-content-mistral-p3",
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
      openpipe: { tags: { promptId: "bad call streaming" } },
    });
  } catch (e: unknown) {
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;

    if (TEST_LAST_LOGGED) {
      const lastLogged = await lastLoggedCall();
      expect(lastLogged?.errorMessage).toEqual(
        "404 The model `gpt-3.5-turbo-blaster` does not exist",
      );
      expect(lastLogged?.statusCode).toEqual(404);
    }
  }
});

test("bad call", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-buster",
      messages: [{ role: "system", content: "count to 10" }],
      openpipe: { tags: { promptId: "bad call" } },
    });
  } catch (e: unknown) {
    // @ts-expect-error need to check for error type
    expect(e.error.message).toEqual("The model `gpt-3.5-turbo-buster` does not exist");
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;

    if (TEST_LAST_LOGGED) {
      const lastLogged = await lastLoggedCall();
      expect(lastLogged?.errorMessage).toEqual(
        "404 The model `gpt-3.5-turbo-buster` does not exist",
      );
      expect(lastLogged?.statusCode).toEqual(404);
    }
  }
});

test("bad call ft", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "openpipe:gpt-3.5-turbo-buster",
      messages: [{ role: "system", content: "count to 10" }],
      openpipe: { tags: { promptId: "bad call ft" } },
    });
  } catch (e: unknown) {
    assert(e instanceof APIError);
    // @ts-expect-error need to check for error type
    expect(e.error.message).toEqual("The model `openpipe:gpt-3.5-turbo-buster` does not exist");

    if (TEST_LAST_LOGGED) {
      const lastLogged = await lastLoggedCall();
      expect(lastLogged?.errorMessage).toEqual(
        "The model `openpipe:gpt-3.5-turbo-buster` does not exist",
      );
      expect(lastLogged?.statusCode).toEqual(404);
    }
  }
});

test("openai content call unusual tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const openpipeOptions = {
    tags: {
      promptId: "openai content call unusual tags",
      numberTag: 1,
      booleanTag: true,
      nullTag: null,
    },
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: openpipeOptions,
  });

  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(completion).toMatchObject(lastLogged?.respPayload);

    const { nullTag, ...expectedTags } = {
      ...getTags(openpipeOptions),
      numberTag: "1",
      booleanTag: "true",
      nullTag: undefined,
    };

    expect(lastLogged?.tags).toMatchObject(expectedTags);
  }
}, 10000);

test("ft content call unusual tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-content-mistral-p3",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const openpipeOptions = {
    tags: {
      promptId: "ft content call unusual tags",
      numberTag: 1,
      booleanTag: true,
      nullTag: null,
    },
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: openpipeOptions,
  });

  await sleep(100);
  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
    expect(completion).toMatchObject(lastLogged?.respPayload);

    const { nullTag, ...expectedTags } = {
      ...getTags(openpipeOptions),
      numberTag: "1",
      booleanTag: "true",
      nullTag: undefined,
    };

    expect(lastLogged?.tags).toMatchObject(expectedTags);
  }
}, 100000);

test("ft content call streaming compatibility", async () => {
  const models = [
    "openpipe:test-tool-calls-mixtral-p3",
    "openpipe:test-tool-calls-mistral-p3",
    "gpt-3.5-turbo",
  ];

  for (const model of models) {
    const payload: ChatCompletionCreateParams = {
      model,
      messages: [{ role: "system", content: "Conut to 10" }],
      n: 1,
      stream: true,
    };
    const completion = await oaiClient.chat.completions.create({
      ...payload,
      openpipe: {
        tags: { promptId: "content call streaming" },
      },
    });

    let merged: ChatCompletion | null = null;
    let isFirstChunk = true;

    for await (const chunk of completion) {
      console.log(chunk.choices[0]?.delta);
      validateOpenAIChunkSignature(chunk);

      if (isFirstChunk) {
        validateRoleInFirstChunk(chunk.choices[0]?.delta);
        isFirstChunk = false;
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
  }
}, 30000);

test("ft tool call streaming compatibility", async () => {
  const models = [
    "openpipe:test-tool-calls-mixtral-p3",
    "openpipe:test-tool-calls-mistral-p3",
    "gpt-3.5-turbo",
  ];

  for (const model of models) {
    const payload: ChatCompletionCreateParams = {
      model,
      messages: [{ role: "system", content: "What is the weather in Seattle?" }],
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
      validateOpenAIChunkSignature(chunk);

      if (isFirstChunk) {
        validateRoleInFirstChunk(chunk.choices[0]?.delta);
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
  }
}, 30000);

export function validateOpenAIChunkSignature(chunk: any) {
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

function validateRoleInFirstChunk(chunk: any) {
  expect(chunk).toHaveProperty("role");
}
