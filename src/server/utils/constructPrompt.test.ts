import { test } from "vitest";
import { constructPrompt } from "./constructPrompt";

test.skip("constructPrompt", async () => {
  const constructed = await constructPrompt(
    {
      constructFn: `prompt = { "fooz": "bar" }`,
    },
    {
      variableValues: {
        foo: "bar",
      },
    },
  );

  console.log(constructed);
});
