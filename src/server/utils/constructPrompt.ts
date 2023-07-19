import { type PromptVariant, type TestScenario } from "@prisma/client";
import ivm from "isolated-vm";
import dedent from "dedent";
import { type SupportedModel, type JSONSerializable } from "../types";
import { openai } from "./openai";

const isolate = new ivm.Isolate({ memoryLimit: 128 });

export async function constructPrompt(
  variant: Pick<PromptVariant, "constructFn">,
  scenario: TestScenario["variableValues"],
): Promise<JSONSerializable> {
  const code = `
      const scenario = ${JSON.stringify(scenario ?? {}, null, 2)};
      let prompt

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

export async function calculateNewConstructFn(
  originalVariant: PromptVariant | null,
  newModel?: SupportedModel,
) {
  if (originalVariant && !newModel) {
    return originalVariant.constructFn;
  }
  if (originalVariant && newModel) {
    return await getPromptFunctionForNewModel(originalVariant, newModel);
  }
  return dedent`
  prompt = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Return 'Hello, world!'",
      }
    ]
  }`;
}

const NUM_RETRIES = 5;
const getPromptFunctionForNewModel = async (
  originalVariant: PromptVariant,
  newModel: SupportedModel,
) => {
  const originalModel = originalVariant.model;
  let newContructionFn = "";
  for (let i = 0; i < NUM_RETRIES; i++) {
    try {
      // TODO: Add api shape info to prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "system",
            content: `Return the prompt constructor function for ${newModel} given the following prompt constructor function for ${originalModel}:\n---\n${originalVariant.constructFn}`,
          },
        ],
      });
      const fn = completion.choices[0]?.message?.content;
      if (fn) {
        newContructionFn = fn;
        break;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return newContructionFn;
};
