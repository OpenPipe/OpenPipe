import { APIConnectionTimeoutError } from "openai/error";
import pkg from "../package.json";

import { DefaultService } from "./codegen";

export type OpenPipeConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export type OpenPipeArgs = {
  openpipe?: {
    logRequest?: boolean;
    cache?: boolean;
    tags?: Record<string, string | number | boolean | null>;
  };
};

export type OpenPipeMeta = {
  // We report your call to OpenPipe asynchronously in the background. If you
  // need to wait until the report is sent to take further action, you can await
  // this promise.
  reportingFinished: Promise<void>;
};

export type ReportFn = (...args: Parameters<DefaultService["report"]>) => Promise<void>;

export const getTags = (
  args: OpenPipeArgs["openpipe"],
): Record<string, string | number | boolean | null> => ({
  ...args?.tags,
  $sdk: "typescript",
  "$sdk.version": pkg.version,
});

export const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number,
  onTimedOut?: () => void,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      onTimedOut?.();
      reject(new APIConnectionTimeoutError({ message: "Request timed out" }));
    }, timeout);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};
