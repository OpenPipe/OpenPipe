import { assertType, test } from "vitest";
import { passThroughNulls } from "./utils";

test("passThroughNulls", () => {
  const square = passThroughNulls((input: number): number => input * 2);

  assertType<null>(square(null));
  assertType<number>(square(10));
  assertType<number | null>(square(Math.random() > 0.1 ? 1 : null));

  const identityFunction = <T>(input: T): T => input;

  assertType<null>(passThroughNulls(identityFunction)(null));

  // This doesn't work! Need to fix `passThroughNulls` to work with generics.
  // assertType<number>(passThroughNulls(identityFunction)(10));
});
