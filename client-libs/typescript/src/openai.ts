import * as openai from "openai";
import * as Core from "openai/core";
import { readEnv } from "openai/core";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsBase,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";

import { WrappedStream } from "./openai/streaming";
import { ApiError, DefaultService } from "./codegen";
import type { Stream } from "openai/streaming";
import { OpenPipeArgs, OpenPipeMeta, type OpenPipeConfig, getTags, withTimeout } from "./shared";
import OpenPipe from "./client";

export type ClientOptions = openai.ClientOptions & { openpipe?: OpenPipeConfig | OpenPipe };
export default class OpenAI extends openai.OpenAI {
  constructor({ openpipe, ...options }: ClientOptions = {}) {
    super({ ...options });

    const openpipeClient = openpipe instanceof OpenPipe ? openpipe : new OpenPipe(openpipe);
    const openPipeApiKey = openpipeClient.baseClient.request.config.TOKEN;

    if (typeof openPipeApiKey === "string" && openPipeApiKey.length > 0) {
      this.chat.setClients(
        openpipeClient,
        new openai.OpenAI({
          baseURL: openpipeClient.baseClient.request.config.BASE,
          apiKey: openPipeApiKey,
        }),
      );
    } else {
      console.warn(
        "You're using the OpenPipe client without an API key. No completion requests will be logged.",
      );
    }
  }
  chat: WrappedChat = new WrappedChat(this);
}

class WrappedChat extends openai.OpenAI.Chat {
  setClients(opClient: OpenPipe, opCompletionClient: openai.OpenAI) {
    this.completions.opClient = opClient;
    this.completions.opCompletionClient = opCompletionClient;
  }

  completions: WrappedCompletions = new WrappedCompletions(this._client);
}

class WrappedCompletions extends openai.OpenAI.Chat.Completions {
  // keep a reference to the original client so we can read options from it
  openaiClient: openai.OpenAI;
  opClient?: OpenPipe;
  opCompletionClient?: openai.OpenAI;

  constructor(client: openai.OpenAI) {
    super(client);
    this.openaiClient = client;
  }

  async _report(args: Parameters<DefaultService["report"]>[0]) {
    try {
      this.opClient ? await this.opClient.report(args) : Promise.resolve();
    } catch (e) {
      // Ignore errors with reporting
    }
  }

  // @ts-expect-error It doesn't like the fact that I added a `Promise<>`
  // wrapper but I actually think the types are correct here.
  create(
    body: ChatCompletionCreateParamsNonStreaming & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<ChatCompletion & { openpipe?: OpenPipeMeta }>;
  create(
    body: ChatCompletionCreateParamsStreaming & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Stream<ChatCompletionChunk> & { openpipe?: OpenPipeMeta }>;
  create(
    body: ChatCompletionCreateParamsBase & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Stream<ChatCompletionChunk> | ChatCompletion>;
  async create(
    { openpipe: rawOpenpipe, ...body }: ChatCompletionCreateParams & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Promise<
    Core.APIPromise<
      | (ChatCompletion & { openpipe?: OpenPipeMeta })
      | (Stream<ChatCompletionChunk> & { openpipe?: OpenPipeMeta })
    >
  > {
    const openpipe = { logRequest: true, ...rawOpenpipe };
    const requestedAt = Date.now();
    let reportingFinished: OpenPipeMeta["reportingFinished"] = Promise.resolve();

    if (body.model.startsWith("openpipe:")) {
      if (!this.opCompletionClient) throw new Error("OpenPipe client not set");
      return this.opCompletionClient?.chat.completions.create(body, {
        ...options,
        headers: {
          ...options?.headers,
          "op-log-request": openpipe.logRequest ? "true" : "false",
          "op-cache": openpipe.cache ? "true" : "false",
          "op-tags": JSON.stringify(getTags(openpipe)),
        },
      });
    }

    try {
      if (body.stream) {
        const stream = await super.create(body, options);
        try {
          return new WrappedStream(stream, (response) => {
            if (!openpipe.logRequest) return Promise.resolve();
            return this._report({
              requestedAt,
              receivedAt: Date.now(),
              reqPayload: body,
              respPayload: response,
              statusCode: 200,
              tags: getTags(openpipe),
            });
          });
        } catch (e) {
          console.error("OpenPipe: error creating wrapped stream");
          console.error(e);
          throw e;
        }
      } else {
        const response = await super.create(body, options);

        reportingFinished = openpipe.logRequest
          ? this._report({
              requestedAt,
              receivedAt: Date.now(),
              reqPayload: body,
              respPayload: response,
              statusCode: 200,
              tags: getTags(openpipe),
            })
          : Promise.resolve();
        return {
          ...response,
          openpipe: {
            reportingFinished,
          },
        };
      }
    } catch (error: unknown) {
      if (error instanceof openai.APIError || error instanceof ApiError) {
        const rawMessage =
          error instanceof openai.APIError
            ? (error.message as string | string[])
            : error.body.message;
        const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
        reportingFinished = this._report({
          requestedAt,
          receivedAt: Date.now(),
          reqPayload: body,
          respPayload: error instanceof openai.APIError ? error.error : error.body,
          statusCode: error.status,
          errorMessage: message,
          tags: getTags(openpipe),
        });
      }
      // make sure error is an object we can add properties to
      if (typeof error === "object" && error !== null) {
        error = {
          ...error,
          openpipe: {
            reportingFinished,
          },
        };
      }

      throw error;
    }
  }
}
