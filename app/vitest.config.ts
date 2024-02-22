import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig, type UserConfig } from "vitest/config";

const config = defineConfig({
  test: {
    ...configDefaults, // Extending Vitest's default options
    setupFiles: ["./src/tests/helpers/setup.ts"],
    globalSetup: ["./src/tests/helpers/globalSetup.ts"],

    // Unfortunately using threads seems to cause issues with isolated-vm
    // threads: false,
  },
  plugins: [tsconfigPaths()],
}) as UserConfig;

export default config;
