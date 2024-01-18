import { type Entries } from "type-fest";

export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);

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

export const getEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>;

export function passThroughNulls<T extends (arg: any) => any>(
  func: T,
): ((arg: null) => null) &
  ((arg: NonNullable<Parameters<T>[0]>) => ReturnType<T>) &
  ((arg: Parameters<T>[0] | null) => ReturnType<T> | null) {
  return (arg: Parameters<T>[0] | null) => {
    if (arg === null) return null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return func(arg as NonNullable<Parameters<T>[0]>);
  };
}

export const numberWithDefault = (
  num: number | string | bigint | null | undefined,
  defaultValue = 0,
) => Number(num ?? defaultValue);
