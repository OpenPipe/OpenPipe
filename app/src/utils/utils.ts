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
