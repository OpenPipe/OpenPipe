import prettier from "prettier/standalone";
import parserTypescript from "prettier/plugins/typescript";

// @ts-expect-error for some reason missing from types
import parserEstree from "prettier/plugins/estree";

// This emits a warning in the browser "Critical dependency: the request of a
// dependency is an expression". Unfortunately doesn't seem to be a way to get
// around it if we want to use Babel client-side for now. One solution would be
// to just do the formatting server-side in a trpc call.
// https://github.com/babel/babel/issues/14301
import * as babel from "@babel/standalone";

export function stripTypes(tsCode: string): string {
  const options = {
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
