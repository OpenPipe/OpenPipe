import { assertType, expect, test } from "vitest";
import { typedFineTune } from "./dbColumns.types";

test("typedFineTune", () => {
  // assertType<null>(typedFineTune(null));

  // expect(typedFineTune(null)).toEqual(null);
  expect(typedFineTune({ provider: "openpipe", baseModel: "meta-llama/Llama-2-7b-hf" })).toEqual({
    provider: "openpipe",
    baseModel: "meta-llama/Llama-2-7b-hf",
  });

  // Checks to make sure the provider and model match
  expect(() =>
    typedFineTune({ provider: "openai", baseModel: "meta-llama/Llama-2-7b-hf" }),
  ).toThrow();

  // const a = await prisma.fineTune.findUnique({ where: { id: "123" } });
  // typedFineTune(a);

  // Assure it passes through other types
  assertType<{
    duck: string;
  }>(typedFineTune({ provider: "openpipe", baseModel: "meta-llama/Llama-2-7b-hf", duck: "quack" }));
});
