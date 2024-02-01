import { readEnv } from "openai/core";

import { OPClient } from "./codegen";
import { OpenPipeConfig } from "./shared";

export default class OpenPipe {
  baseClient: OPClient;

  constructor(config: OpenPipeConfig = {}) {
    const openPipeApiKey = config?.apiKey ?? readEnv("OPENPIPE_API_KEY");
    const openpipeBaseUrl = config?.baseUrl ?? readEnv("OPENPIPE_BASE_URL");

    this.baseClient = new OPClient({
      BASE: openpipeBaseUrl,
      TOKEN: openPipeApiKey,
    });
  }

  updateLogTags(...params: Parameters<OPClient["default"]["updateLogTags"]>) {
    return this.baseClient.default.updateLogTags(...params);
  }

  report(...params: Parameters<OPClient["default"]["report"]>) {
    return this.baseClient.default.report(...params);
  }
}
