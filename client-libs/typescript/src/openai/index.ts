import * as openai from "openai-beta";
import * as Core from "openai-beta/core";
import { readEnv, type RequestOptions } from "openai-beta/core";
import {
  ChatCompletion,
  ChatCompletionChunk,
  CompletionCreateParams,
  Completions,
} from "openai-beta/resources/chat/completions";

import { DefaultService, OPClient } from "../codegen";
import { Stream } from "openai-beta/streaming";
import { OpenPipeArgs, OpenPipeMeta, type OpenPipeConfig, getTags } from "../shared";

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
        })
      );
    } else {
      console.warn(
        "You're using the OpenPipe client without an API key. No completion requests will be logged."
      );
    }
  }
  chat: WrappedChat = new WrappedChat(this);
}

class WrappedChat extends openai.OpenAI.Chat {
  setClient(client: OPClient) {
    this.completions.opClient = client;
  }

  completions: InstrumentedCompletions = new InstrumentedCompletions(this.client);
}

class InstrumentedCompletions extends openai.OpenAI.Chat.Completions {
  opClient?: OPClient;

  constructor(client: openai.OpenAI, opClient?: OPClient) {
    super(client);
    this.opClient = opClient;
  }

  _report(args: Parameters<DefaultService["report"]>[0]) {
    try {
      return this.opClient ? this.opClient.default.report(args) : Promise.resolve();
    } catch (e) {
      console.error(e);
      return Promise.resolve();
    }
  }

  create(
    body: CompletionCreateParams.CreateChatCompletionRequestNonStreaming & OpenPipeArgs,
    options?: Core.RequestOptions
  ): Promise<Core.APIResponse<ChatCompletion & { openpipe: OpenPipeMeta }>>;
  create(
    body: CompletionCreateParams.CreateChatCompletionRequestStreaming & OpenPipeArgs,
    options?: Core.RequestOptions
  ): Promise<Core.APIResponse<Stream<ChatCompletionChunk>>>;
  async create(
    { openpipe, ...body }: CompletionCreateParams & OpenPipeArgs,
    options?: Core.RequestOptions
  ): Promise<
    Core.APIResponse<(ChatCompletion & { openpipe: OpenPipeMeta }) | Stream<ChatCompletionChunk>>
  > {
    console.log("LALALA REPORT", this.opClient);
    const requestedAt = Date.now();
    const cacheRequested = openpipe?.cache ?? false;

    if (cacheRequested) {
      try {
        const cached = await this.opClient?.default
          .checkCache({
            requestedAt,
            reqPayload: body,
            tags: getTags(openpipe),
          })
          .then((res) => res.respPayload);

        if (cached) {
          return {
            ...cached,
            openpipe: {
              cacheStatus: "HIT",
              reportingFinished: Promise.resolve(),
            },
          };
        }
      } catch (e) {
        console.error(e);
      }
    }

    let reportingFinished: OpenPipeMeta["reportingFinished"] = Promise.resolve();

    try {
      if (body.stream) {
        const stream = await super.create(body, options);

        // Do some logging of each chunk here

        return stream;
      } else {
        const response = await super.create(body, options);

        reportingFinished = this._report({
          requestedAt,
          receivedAt: Date.now(),
          reqPayload: body,
          respPayload: response,
          statusCode: 200,
          tags: getTags(openpipe),
        });
        return {
          ...response,
          openpipe: {
            cacheStatus: cacheRequested ? "MISS" : "SKIP",
            reportingFinished,
          },
        };
      }
    } catch (error: unknown) {
      if (error instanceof openai.APIError) {
        const rawMessage = error.message as string | string[];
        const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
        reportingFinished = this._report({
          requestedAt,
          receivedAt: Date.now(),
          reqPayload: body,
          respPayload: error.error,
          statusCode: error.status,
          errorMessage: message,
          tags: getTags(openpipe),
        });
      }

      throw error;
    }
  }
}
