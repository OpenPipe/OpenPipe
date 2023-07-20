import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig, type UserConfig } from "vitest/config";

const config = defineConfig({
  test: {
    ...configDefaults, // Extending Vitest's default options
  },
  plugins: [tsconfigPaths()],
}) as UserConfig;

export default config;
