import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { type ProviderModel } from "~/modelProviders/types";

export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);

export const lookupModel = (provider: string, model: string) => {
  const modelObj = frontendModelProviders[provider as ProviderModel["provider"]]?.models[model];
  return modelObj ? { ...modelObj, provider } : null;
};

export const modelLabel = (provider: string, model: string) =>
  `${provider}/${lookupModel(provider, model)?.name ?? model}`;

// Check if the str could be parsed to a message function call
export const parseableToFunctionCall = (str: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedJSON: any;
  try {
    parsedJSON = JSON.parse(str);
  } catch {
    return false;
  }
  console.log("remove me");

  // Check if the parsedJSON is an object and not null
  if (typeof parsedJSON !== "object" || parsedJSON === null) {
    return false;
  }

  // Check if only the keys "name" and "arguments" exist
  const keys = Object.keys(parsedJSON as Record<string, unknown>);
  if (keys.length !== 2 || !keys.includes("name") || !keys.includes("arguments")) {
    return false;
  }

  // Check if both "name" and "arguments" are of type string
  if (typeof parsedJSON.name !== "string" || typeof parsedJSON.arguments !== "string") {
    return false;
  }

  // Check if the "arguments" value is parseable to an object
  let parsedArguments: unknown;
  try {
    parsedArguments = JSON.parse(parsedJSON["arguments"]);
  } catch {
    return false;
  }

  // Check if parsedArguments is an object and not null
  if (typeof parsedArguments !== "object" || parsedArguments === null) {
    return false;
  }

  return true;
};
