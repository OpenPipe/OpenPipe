import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { type ProviderModel } from "~/modelProviders/types";

export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);

export const lookupModel = (provider: string, model: string) => {
  const modelObj = frontendModelProviders[provider as ProviderModel["provider"]]?.models[model];
  return modelObj ? { ...modelObj, provider } : null;
};

export const modelLabel = (provider: string, model: string) =>
  `${provider}/${lookupModel(provider, model)?.name ?? model}`;
