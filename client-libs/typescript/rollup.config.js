import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

const externalTest = (id) => {
  // don't bundle node_modules
  if (id.includes("node_modules")) {
    return true;
  }
};

const sharedConfig = {
  plugins: [typescript(), resolve(), json()],
  external: externalTest,
  output: [
    {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs.js",
      sourcemap: true,
    },
    {
      dir: "dist",
      format: "es",
      entryFileNames: "[name].esm.js",
      sourcemap: true,
    },
  ],
};

export default [
  {
    input: "src/index.ts",
    ...sharedConfig,
  },
  {
    input: "src/openai.ts",
    ...sharedConfig,
  },
];
