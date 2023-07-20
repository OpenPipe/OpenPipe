import { type PromptVariant, type TestScenario } from "@prisma/client";
import ivm from "isolated-vm";
import { type JSONSerializable } from "../types";

const isolate = new ivm.Isolate({ memoryLimit: 128 });

export async function constructPrompt(
  variant: Pick<PromptVariant, "constructFn">,
  scenario: TestScenario["variableValues"],
): Promise<JSONSerializable> {
  const code = `
      const scenario = ${JSON.stringify(scenario ?? {}, null, 2)};
      let prompt = {};

      ${variant.constructFn}

      global.prompt = prompt;
      `;

  console.log("code is", code);

  const context = await isolate.createContext();

  const jail = context.global;
  await jail.set("global", jail.derefInto());

  const script = await isolate.compileScript(code);

  await script.run(context);
  const promptReference = (await context.global.get("prompt")) as ivm.Reference;

  const prompt = await promptReference.copy(); // Get the actual value from the isolate

  return prompt as JSONSerializable;
}
