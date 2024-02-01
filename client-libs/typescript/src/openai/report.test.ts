import { expect, test } from "vitest";
import OpenAI from "../openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import OpenPipe from "../client";
import { OPENPIPE_API_KEY, OPENPIPE_BASE_URL, TEST_LAST_LOGGED } from "../testConfig";

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: OPENPIPE_API_KEY,
    baseUrl: OPENPIPE_BASE_URL,
  },
});

const opClient = new OpenPipe({
  apiKey: OPENPIPE_API_KEY,
  baseUrl: OPENPIPE_BASE_URL,
});

const lastLoggedCall = async () =>
  opClient.baseClient.default.localTestingOnlyGetLatestLoggedCall();

test("reports valid response payload", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const tags = {
    promptId: "reports valid response payload",
  };

  const completionResp = await oaiClient.chat.completions.create(payload);
  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: completionResp,
    tags,
  });

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(completionResp).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.tags).toMatchObject(tags);
  }
});

test("reports null response payload", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const tags = {
    promptId: "reports null response payload",
  };

  const resp = await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    respPayload: null,
    tags,
  });

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(lastLogged?.respPayload).toBe(null);
    expect(lastLogged?.tags).toMatchObject(tags);
  }
});

test("reports invalid request payload", async () => {
  const payload = {
    x: "invalid",
  };

  const tags = {
    promptId: "reports invalid request payload",
  };

  await opClient.report({
    requestedAt: Date.now(),
    receivedAt: Date.now(),
    reqPayload: payload,
    tags,
  });

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(lastLogged?.tags).toMatchObject(tags);
  }
});

test("reports unusual tags", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };

  const tags = {
    promptId: "reports unusual tags",
    numberTag: 1,
    booleanTag: true,
    nullTag: null,
  };

  const { openpipe, ...completionResp } = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags,
    },
  });

  await openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();

    console.log(lastLogged?.tags);
    expect(lastLogged?.reqPayload).toMatchObject(payload);
    expect(lastLogged?.respPayload).toMatchObject(completionResp);
    expect(lastLogged?.tags["promptId"]).toBe("reports unusual tags");
    expect(lastLogged?.tags["numberTag"]).toBe("1");
    expect(lastLogged?.tags["booleanTag"]).toBe("true");
    expect(lastLogged?.tags["nullTag"]).toBe(undefined);
  }
});
