import { expect, test } from "vitest";
import { stripTypes } from "./formatPromptConstructor";

test("stripTypes", () => {
  expect(stripTypes(`const foo: string = "bar";`)).toBe(`const foo = "bar";`);
});

test("stripTypes with invalid syntax", () => {
  expect(stripTypes(`asdf foo: string = "bar"`)).toBe(`asdf foo: string = "bar"`);
});
