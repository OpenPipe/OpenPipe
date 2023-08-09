import * as openPipeClient from "../codegen";
import * as openai from "openai-legacy";
import { version } from "../package.json";

// Anything we don't override we want to pass through to openai directly
export * as openAILegacy from "openai-legacy";

type OPConfigurationParameters = {
  apiKey?: string;
  basePath?: string;
};

export class Configuration extends openai.Configuration {
  public qkConfig?: openPipeClient.Configuration;

  constructor(config: openai.ConfigurationParameters & { opParameters?: OPConfigurationParameters }) {
    super(config);
    if (config.opParameters) {
      this.qkConfig = new openPipeClient.Configuration(config.opParameters);
    }
  }
}

type CreateChatCompletion = InstanceType<typeof openai.OpenAIApi>["createChatCompletion"];

export class OpenAIApi extends openai.OpenAIApi {
  public openPipeApi?: openPipeClient.DefaultApi;

  constructor(config: Configuration) {
    super(config);
    if (config.qkConfig) {
      this.openPipeApi = new openPipeClient.DefaultApi(config.qkConfig);
    }
  }

  public async createChatCompletion(
    createChatCompletionRequest: Parameters<CreateChatCompletion>[0],
    options?: Parameters<CreateChatCompletion>[1]
  ): ReturnType<CreateChatCompletion> {
    const startTime = Date.now();
    let resp: Awaited<ReturnType<CreateChatCompletion>> | null = null;
    let respPayload: openai.CreateChatCompletionResponse | null = null;
    let respStatus: number | undefined = undefined;
    let error: string | undefined;
    try {
      resp = await super.createChatCompletion(createChatCompletionRequest, options);
      respPayload = resp.data;
      respStatus = resp.status;
    } catch (err) {
      console.error("Error in createChatCompletion");
      if ("isAxiosError" in err && err.isAxiosError) {
        error = err.response?.data?.error?.message;
        respPayload = err.response?.data;
        respStatus = err.response?.status;
      } else if ("message" in err) {
        error = err.message.toString();
      }
      throw err;
    } finally {
      this.openPipeApi
        ?.externalApiReport({
          startTime,
          endTime: Date.now(),
          reqPayload: createChatCompletionRequest,
          respPayload: respPayload,
          respStatus: respStatus,
          error,
          tags: {
            client: "openai-js",
            clientVersion: version,
          },
        })
        .catch((err) => {
          console.error("Error reporting to QK", err);
        });
    }

    console.log("done");
    return resp;
  }
}
