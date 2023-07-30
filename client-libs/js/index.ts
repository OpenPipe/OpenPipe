import * as opClient from "./codegen";
import { PromptTypes } from "./codegen/promptTypes";
import { version } from "./package.json";

type OPConfigOptions = {
  apiKey?: string;
  basePath?: string;
};

export class Configuration {
  public opConfig?: opClient.Configuration;
  // TODO: use OpenAPI apiKey or something similar
  public apiKey: string;

  constructor(config: { opOptions?: OPConfigOptions }) {
    if (config.opOptions) {
      this.opConfig = new opClient.Configuration(config.opOptions);
      this.apiKey = config.opOptions.apiKey ?? "";
    }
  }
}

export class OpenPipeApi {
  public opApi?: opClient.DefaultApi;
  private apiKey: string;

  constructor(config: Configuration) {
    if (config.opConfig) {
      this.opApi = new opClient.DefaultApi(config.opConfig);
      this.apiKey = config.apiKey;
    }
  }

  public async capturePrompt<T extends keyof PromptTypes>(
    dataFlowId: string,
    modelProvider: T,
    promptFunction: () => PromptTypes[T],
    scenarioVariables: Record<string, unknown>
  ) {
    const prompt = promptFunction() as PromptTypes[T];
    if (!prompt) {
      console.error("Prompt function returned null", promptFunction.toString());
    }
    const promptFunctionString = promptFunction.toString();
    const startTime = Date.now();

    let resp;

    try {
      resp = await this.opApi?.externalApiCapturePrompt({
        apiKey: this.apiKey,
        dataFlowId,
        promptFunction: promptFunctionString,
        scenarioVariables,
        model: "",
        modelProvider,
        prompt,
      });
    } catch (err) {
      console.error("Error reporting to OpenPipe", err);
    }

    return {
      id: resp?.data?.loggedCallId,
      prompt: prompt!,
    };
  }

  public async captureResponse(
    loggedCallId: string | undefined,
    responsePayload: any
  ): Promise<void> {
    if (!loggedCallId) {
      console.error("No call log ID provided to captureResponse");
      return;
    }

    try {
      await this.opApi?.externalApiCaptureResponse({
        apiKey: this.apiKey,
        loggedCallId,
        responsePayload,
      });
    } catch (err) {
      console.error("Error reporting to OpenPipe", err);
    }
  }
}
