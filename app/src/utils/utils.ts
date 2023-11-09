import frontendModelProviders from "~/modelProviders/frontendModelProviders";
import { type ProviderModel } from "~/modelProviders/types";

export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);

export const lookupModel = (provider: string, model: string) => {
  const modelObj = frontendModelProviders[provider as ProviderModel["provider"]]?.models[model];
  return modelObj ? { ...modelObj, provider } : null;
};

export const modelLabel = (provider: string, model: string) =>
  `${provider}/${lookupModel(provider, model)?.name ?? model}`;

export const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  for (const size of sizes) {
    if (bytes < k) return `${parseFloat(bytes.toFixed(dm))} ${size}`;
    bytes /= k;
  }

  return "> 1024 TB";
};

export const ensureDefaultExport = <T>(module: T) => {
  const defaultExport = module as unknown as { default: T };
  return defaultExport.default ?? module;
};
