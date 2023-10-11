import prettier from "prettier/standalone";
import parserTypescript from "prettier/plugins/typescript";

// @ts-expect-error for some reason missing from types
import parserEstree from "prettier/plugins/estree";

export default async function formatPromptConstructor(code: string): Promise<string> {
  return await prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypescript, parserEstree],
    // We're showing these in pretty narrow panes so let's keep the print width low
    printWidth: 60,
  });
}
