import prettier from "prettier/standalone";
import parserTypescript from "prettier/plugins/typescript";

// @ts-expect-error for some reason missing from types
import parserEstree from "prettier/plugins/estree";

import * as babel from "@babel/standalone";

export function stripTypes(tsCode: string): string {
  const options = {
    presets: ["typescript"],
    filename: "file.ts",
  };

  try {
    const result = babel.transform(tsCode, options);
    return result.code ?? tsCode;
  } catch (error) {
    console.error("Error stripping types", error);
    return tsCode;
  }
}

export default async function formatPromptConstructor(code: string): Promise<string> {
  return await prettier.format(stripTypes(code), {
    parser: "typescript",
    plugins: [parserTypescript, parserEstree],
    // We're showing these in pretty narrow panes so let's keep the print width low
    printWidth: 60,
  });
}
