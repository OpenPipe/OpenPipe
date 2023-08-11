import * as openai from "openai-beta";
import { readEnv, type RequestOptions } from "openai-beta/core";
import { CompletionCreateParams } from "openai-beta/resources/chat/completions";
import axios from "axios";

export * as openai from "openai-beta";
import * as openPipeClient from "../codegen";

interface ClientOptions extends openai.ClientOptions {
  openPipeApiKey?: string;
  openPipeBaseUrl?: string;
}

export class OpenAI extends openai.OpenAI {
  public openPipeApi?: openPipeClient.DefaultApi;

  constructor({
    openPipeApiKey = readEnv("OPENPIPE_API_KEY"),
    openPipeBaseUrl = readEnv("OPENPIPE_BASE_URL") ??
      `https://app.openpipe.ai/v1`,
    ...opts
  }: ClientOptions = {}) {
    super({ ...opts });

    if (openPipeApiKey) {
      const axiosInstance = axios.create({
        baseURL: openPipeBaseUrl,
        headers: {
          "x-openpipe-api-key": openPipeApiKey,
        },
      });
      this.openPipeApi = new openPipeClient.DefaultApi(
        new openPipeClient.Configuration({
          apiKey: openPipeApiKey,
          basePath: openPipeBaseUrl,
        }),
        undefined,
        axiosInstance
      );
    }

    // Override the chat property
    this.chat = new ExtendedChat(this);

    if (openPipeApiKey === undefined) {
      console.error(
        "The OPENPIPE_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenPipe client with an openPipeApiKey option, like new OpenPipe({ openPipeApiKey: undefined })."
      );
    }
  }
}

class ExtendedChat extends openai.OpenAI.Chat {
  completions: ExtendedCompletions;

  constructor(openaiInstance: OpenAI) {
    super(openaiInstance);
    // Initialize the new completions instance
    this.completions = new ExtendedCompletions(openaiInstance);
  }
}

class ExtendedCompletions extends openai.OpenAI.Chat.Completions {
  private openaiInstance: OpenAI;

  constructor(openaiInstance: OpenAI) {
    super(openaiInstance);
    this.openaiInstance = openaiInstance;
  }

  async create(
    params:
      | CompletionCreateParams.CreateChatCompletionRequestNonStreaming
      | CompletionCreateParams.CreateChatCompletionRequestStreaming,
    options?: RequestOptions,
    tags?: Record<string, string>
  ): Promise<any> {
    // Your pre API call logic here
    console.log("Doing pre API call...");

    // Determine the type of request
    if (params.hasOwnProperty("stream") && params.stream === true) {
      const result = await super.create(
        params as CompletionCreateParams.CreateChatCompletionRequestStreaming,
        options
      );
      // Your post API call logic here
      console.log("Doing post API call for Streaming...");
      return result;
    } else {
      const requestedAt = Date.now();
      const result = await super.create(
        params as CompletionCreateParams.CreateChatCompletionRequestNonStreaming,
        options
      );
      await this.openaiInstance.openPipeApi?.externalApiReport({
        requestedAt,
        receivedAt: Date.now(),
        reqPayload: params,
        respPayload: result,
        statusCode: 200,
        errorMessage: undefined,
        tags,
      });

      // Your post API call logic here
      console.log("Doing post API call for NonStreaming...");
      return result;
    }
  }
}
