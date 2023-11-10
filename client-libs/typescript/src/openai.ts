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
import { ApiError, DefaultService, OPClient } from "./codegen";
import type { Stream } from "openai/streaming";
import { OpenPipeArgs, OpenPipeMeta, type OpenPipeConfig, getTags, withTimeout } from "./shared";

export type ClientOptions = openai.ClientOptions & { openpipe?: OpenPipeConfig };
export default class OpenAI extends openai.OpenAI {
  public opClient?: OPClient;

  constructor({ openpipe, ...options }: ClientOptions = {}) {
    super({ ...options });

    const openPipeApiKey = openpipe?.apiKey ?? readEnv("OPENPIPE_API_KEY");

    if (openPipeApiKey) {
      this.chat.setClient(
        new OPClient({
          BASE:
            openpipe?.baseUrl ?? readEnv("OPENPIPE_BASE_URL") ?? "https://app.openpipe.ai/api/v1",
          TOKEN: openPipeApiKey,
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
  setClient(client: OPClient) {
    this.completions.opClient = client;
  }

  completions: WrappedCompletions = new WrappedCompletions(this.client);
}

class WrappedCompletions extends openai.OpenAI.Chat.Completions {
  // keep a reference to the original client so we can read options from it
  openaiClient: openai.OpenAI;
  opClient?: OPClient;

  constructor(client: openai.OpenAI, opClient?: OPClient) {
    super(client);
    this.openaiClient = client;
    this.opClient = opClient;
  }

  async _report(args: Parameters<DefaultService["report"]>[0]) {
    try {
      this.opClient ? await this.opClient.default.report(args) : Promise.resolve();
    } catch (e) {
      // Ignore errors with reporting
    }
  }

  _create(
    body: ChatCompletionCreateParamsNonStreaming,
    options?: Core.RequestOptions,
  ): Core.APIPromise<ChatCompletion>;
  _create(
    body: ChatCompletionCreateParamsStreaming,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Stream<ChatCompletionChunk>>;
  _create(
    body: ChatCompletionCreateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<ChatCompletion | Stream<ChatCompletionChunk>> {
    let resp: Core.APIPromise<ChatCompletion | Stream<ChatCompletionChunk>>;

    if (body.model.startsWith("openpipe:")) {
      if (!this.opClient) throw new Error("OpenPipe client not set");
      const opClientPromise = this.opClient.default.createChatCompletion(body);
      resp = withTimeout(opClientPromise, options?.timeout ?? this.openaiClient.timeout, () =>
        opClientPromise.cancel(),
      ) as Core.APIPromise<ChatCompletion>;
    } else {
      resp = body.stream ? super.create(body, options) : super.create(body, options);
    }

    return resp;
  }

  // @ts-expect-error It doesn't like the fact that I added a `Promise<>`
  // wrapper but I actually think the types are correct here.
  create(
    body: ChatCompletionCreateParamsNonStreaming & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<ChatCompletion & { openpipe: OpenPipeMeta }>;
  create(
    body: ChatCompletionCreateParamsStreaming & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<WrappedStream>;
  create(
    body: ChatCompletionCreateParamsBase & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Stream<ChatCompletionChunk> | ChatCompletion>;
  async create(
    { openpipe: rawOpenpipe, ...body }: ChatCompletionCreateParams & OpenPipeArgs,
    options?: Core.RequestOptions,
  ): Promise<Core.APIPromise<(ChatCompletion & { openpipe: OpenPipeMeta }) | WrappedStream>> {
    const openpipe = { logRequest: true, ...rawOpenpipe };
    const requestedAt = Date.now();
    let reportingFinished: OpenPipeMeta["reportingFinished"] = Promise.resolve();

    try {
      if (body.stream) {
        const stream = await this._create(body, options);
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
        const response = await this._create(body, options);

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
