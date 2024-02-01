// import dotenv from "dotenv";
import { expect, test } from "vitest";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import OpenPipe from "../client";
import { OPENPIPE_API_KEY, OPENPIPE_API_URL, TEST_LAST_LOGGED } from "./setup";

const opClient = new OpenPipe({
  baseUrl: OPENPIPE_API_URL,
  apiKey: OPENPIPE_API_KEY,
});

const respPayload = {
  model: "gpt-3.5-turbo-0613",
  usage: {
    total_tokens: 39,
    prompt_tokens: 11,
    completion_tokens: 28,
  },
  object: "chat.completion",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10",
      },
      finish_reason: "stop",
    },
  ],
  created: 1704449593,
};

const generateRandomId = () => Math.random().toString(36).substring(7);

const lastLoggedCall = async () =>
  opClient.baseClient.default.localTestingOnlyGetLatestLoggedCall();

test("adds tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
    },
  });

  const newTags = {
    any_key: "any value",
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [{ field: "tags.prompt_id", equals: originalPromptId }],
    tags: newTags,
  });

  expect(resp.matchedLogs).toEqual(1);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(originalPromptId);
    expect(lastLogged?.tags.any_key).toEqual(newTags.any_key);
    expect(lastLogged?.tags.otherId).toEqual(newTags.otherId);
  }
});

test("updates tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 2",
      any_key: "any value",
    },
  });

  const updatedTags = {
    prompt_id: "updated prompt id " + generateRandomId(),
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [{ field: "tags.prompt_id", equals: originalPromptId }],
    tags: updatedTags,
  });

  expect(resp.matchedLogs).toEqual(2);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(updatedTags.prompt_id);
    expect(lastLogged?.tags.otherId).toEqual(updatedTags.otherId);
    expect(lastLogged?.tags.any_key).toEqual("any value");
  }
});

test("updates tag by completionId", async () => {
  const completionId = generateRandomId();
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: {
      id: "other completion id",
      ...respPayload,
    },
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: {
      id: completionId,
      ...respPayload,
    },
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 2",
      any_key: "any value",
    },
  });

  const updatedTags = {
    prompt_id: "updated prompt id " + generateRandomId(),
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [{ field: "completionId", equals: completionId }],
    tags: updatedTags,
  });

  expect(resp.matchedLogs).toEqual(1);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(updatedTags.prompt_id);
    expect(lastLogged?.tags.otherId).toEqual(updatedTags.otherId);
    expect(lastLogged?.tags.any_key).toEqual("any value");
  }
});

test("updates tag by model", async () => {
  const model = generateRandomId();
  const payload: ChatCompletionCreateParams = {
    model,
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  const updatedTags = {
    prompt_id: "updated prompt id " + generateRandomId(),
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [{ field: "model", equals: model }],
    tags: updatedTags,
  });

  expect(resp.matchedLogs).toEqual(1);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(updatedTags.prompt_id);
    expect(lastLogged?.tags.otherId).toEqual(updatedTags.otherId);
    expect(lastLogged?.tags.any_key).toEqual("any value");
  }
});

test("updates by combination of filters", async () => {
  const model = generateRandomId();
  const payload: ChatCompletionCreateParams = {
    model,
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  const updatedTags = {
    prompt_id: "updated prompt id " + generateRandomId(),
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [
      { field: "model", equals: model },
      { field: "tags.prompt_id", equals: originalPromptId },
    ],
    tags: updatedTags,
  });

  expect(resp.matchedLogs).toEqual(1);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(updatedTags.prompt_id);
    expect(lastLogged?.tags.otherId).toEqual(updatedTags.otherId);
    expect(lastLogged?.tags.any_key).toEqual("any value");
  }
});

test("updates some tags by combination of filters", async () => {
  const model = generateRandomId();
  const otherModel = "model-to-not-update";
  const payload: ChatCompletionCreateParams = {
    model,
    messages: [{ role: "system", content: "count to 3" }],
  };

  const originalPromptId = "original prompt id " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: {
      ...payload,
      model: otherModel,
    },
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  const updatedTags = {
    prompt_id: "updated prompt id " + generateRandomId(),
    otherId: "value 3",
  };

  const resp = await opClient.updateLogTags({
    filters: [
      { field: "model", equals: model },
      { field: "tags.prompt_id", equals: originalPromptId },
    ],
    tags: updatedTags,
  });

  expect(resp.matchedLogs).toEqual(2);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(originalPromptId);
    expect(lastLogged?.tags.otherId).toEqual("value 1");
    expect(lastLogged?.tags.any_key).toEqual("any value");
  }
});

test("deletes tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const keepPromptId = "prompt id for tag to keep " + generateRandomId();
  const deletePromptId = "prompt id for tag to delete " + generateRandomId();

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: keepPromptId,
      otherId: "value 1",
      any_key: "any value",
    },
  });

  const keepResp = await opClient.updateLogTags({
    filters: [{ field: "tags.prompt_id", equals: deletePromptId }],
    tags: { prompt_id: null },
  });

  expect(keepResp.matchedLogs).toEqual(0);

  if (TEST_LAST_LOGGED) {
    const keepLoggedCall = await lastLoggedCall();
    expect(keepLoggedCall?.tags.prompt_id).toEqual(keepPromptId);
  }

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      prompt_id: deletePromptId,
      otherId: "value 2",
      any_key: "any value",
    },
  });

  const resp = await opClient.updateLogTags({
    filters: [{ field: "tags.prompt_id", equals: deletePromptId }],
    tags: { prompt_id: null },
  });

  expect(resp.matchedLogs).toEqual(1);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    expect(lastLogged?.tags.prompt_id).toEqual(undefined);
  }
});

test("deletes nothing when no tags matched", async () => {
  const originalPromptId = "id 1";
  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: null,
    respPayload: null,
    tags: {
      prompt_id: originalPromptId,
    },
  });
  const resp = await opClient.updateLogTags({
    filters: [{ field: "tags.prompt_id", equals: generateRandomId() }],
    tags: { prompt_id: null },
  });

  expect(resp.matchedLogs).toEqual(0);

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.tags.prompt_id).toEqual(originalPromptId);
  }
});

test("deletes from all logged calls when no filters provided", async () => {
  const promptId = generateRandomId();
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      promptId,
    },
  });

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags: {
      promptId,
    },
  });

  const resp = await opClient.updateLogTags({
    filters: [],
    tags: { promptId: null },
  });

  expect(resp.matchedLogs).toBeGreaterThanOrEqual(2);

  if (TEST_LAST_LOGGED) {
    const firstLogged = await lastLoggedCall();
    expect(firstLogged?.tags.prompt_id).toEqual(undefined);

    const secondLogged = await lastLoggedCall();
    expect(secondLogged?.tags.prompt_id).toEqual(undefined);
  }
});
