import { Options } from "tsup";

const config: Options = {
  splitting: false, // Disable code splitting
  sourcemap: true, // Include sourcemaps
  target: "es2020", // Target ES2020 syntax for modern environments
  dts: true, // Generate declaration files

  // Define entry points
  entry: [
    "src/index.ts", // Main entry
    "src/client.ts", // 'client' sub-module
    "src/openai.ts", // 'openai' sub-module
    "src/openai/mergeChunks.ts", // 'openai/mergeChunks' sub-module
    "src/openai/streaming.ts", // 'openai/streaming' sub-module
  ],

  // Define format of the output bundles
  format: ["cjs", "esm"],

  // External libraries that shouldn't be bundled
  external: [...Object.keys(require("./package.json").dependencies || {})],
};

export default config;
