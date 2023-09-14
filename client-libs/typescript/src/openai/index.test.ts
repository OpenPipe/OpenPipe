import dotenv from "dotenv";
import { expect, test } from "vitest";
import OpenAI from "../openai";
import {
  ChatCompletion,
  CompletionCreateParams,
  CreateChatCompletionRequestMessage,
} from "openai-beta/resources/chat/completions";
import { OPClient } from "../codegen";
import mergeChunks from "./mergeChunks";
import assert from "assert";

dotenv.config({ path: "../.env" });

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

const lastLoggedCall = async () => opClient.default.localTestingOnlyGetLatestLoggedCall();

test("basic call", async () => {
  const payload: CompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: { tags: { promptId: "test" } },
  });
  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();
  expect(lastLogged?.modelResponse?.reqPayload).toMatchObject(payload);
  expect(completion).toMatchObject(lastLogged?.modelResponse?.respPayload);
  expect(lastLogged?.tags).toMatchObject({ promptId: "test" });
});

const randomString = (length: number) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
};

test("streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  const lastLogged = await lastLoggedCall();
  await completion.openpipe.reportingFinished;

  expect(merged).toMatchObject(lastLogged?.modelResponse?.respPayload);
  expect(lastLogged?.modelResponse?.reqPayload.messages).toMatchObject([
    { role: "system", content: "count to 3" },
  ]);
});

test("bad call streaming", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-blaster",
      messages: [{ role: "system", content: "count to 10" }],
      stream: true,
    });
  } catch (e) {
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.modelResponse?.errorMessage).toEqual(
      "The model `gpt-3.5-turbo-blaster` does not exist",
    );
    expect(lastLogged?.modelResponse?.statusCode).toEqual(404);
  }
});

test("bad call", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-buster",
      messages: [{ role: "system", content: "count to 10" }],
    });
  } catch (e) {
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.modelResponse?.errorMessage).toEqual(
      "The model `gpt-3.5-turbo-buster` does not exist",
    );
    expect(lastLogged?.modelResponse?.statusCode).toEqual(404);
  }
});

test("caching", async () => {
  const message: CreateChatCompletionRequestMessage = {
    role: "system",
    content: `repeat '${randomString(10)}'`,
  };
  const completion = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [message],
    openpipe: { cache: true },
  });
  expect(completion.openpipe.cacheStatus).toEqual("MISS");

  await completion.openpipe.reportingFinished;
  const firstLogged = await lastLoggedCall();

  expect(completion.choices[0]?.message.content).toEqual(
    firstLogged?.modelResponse?.respPayload.choices[0].message.content,
  );

  const completion2 = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [message],
    openpipe: { cache: true },
  });
  expect(completion2.openpipe.cacheStatus).toEqual("HIT");
});
