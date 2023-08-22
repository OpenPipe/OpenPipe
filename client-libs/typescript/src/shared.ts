import pkg from "../package.json";
import { DefaultService } from "./codegen";

export type OpenPipeConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export type OpenPipeArgs = {
  openpipe?: { cache?: boolean; tags?: Record<string, string> };
};

export type OpenPipeMeta = {
  cacheStatus: "HIT" | "MISS" | "SKIP";

  // We report your call to OpenPipe asynchronously in the background. If you
  // need to wait until the report is sent to take further action, you can await
  // this promise.
  reportingFinished: Promise<void>;
};

export type ReportFn = (...args: Parameters<DefaultService["report"]>) => Promise<void>;

export const getTags = (args: OpenPipeArgs["openpipe"]): Record<string, string> => ({
  ...args?.tags,
  ...(args?.cache ? { $cache: args.cache?.toString() } : {}),
  $sdk: "typescript",
  "$sdk.version": pkg.version,
});
