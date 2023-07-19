import { type PromptVariant } from "@prisma/client";
import { type SupportedModel } from "../types";
import ivm from "isolated-vm";
import dedent from "dedent";
import { openai } from "./openai";
import { getApiShapeForModel } from "./getTypesForModel";
import { isObject } from "lodash-es";
import { type CompletionCreateParams } from "openai/resources/chat/completions";

const isolate = new ivm.Isolate({ memoryLimit: 128 });

export async function deriveNewConstructFn(
  originalVariant: PromptVariant | null,
  newModel?: SupportedModel,
  instructions?: string,
) {
  if (originalVariant && !newModel && !instructions) {
    return originalVariant.constructFn;
  }
  if (originalVariant && (newModel || instructions)) {
    return await requestUpdatedPromptFunction(originalVariant, newModel, instructions);
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
const requestUpdatedPromptFunction = async (
  originalVariant: PromptVariant,
  newModel?: SupportedModel,
  instructions?: string,
) => {
  const originalModel = originalVariant.model as SupportedModel;
  let newContructionFn = "";
  for (let i = 0; i < NUM_RETRIES; i++) {
    try {
      const messages: CompletionCreateParams.CreateChatCompletionRequestNonStreaming.Message[] = [
        {
          role: "system",
          content: `Your job is to update prompt constructor functions. Here is the api shape for the current model:\n---\n${JSON.stringify(
            getApiShapeForModel(originalModel),
            null,
            2,
          )}`,
        },
      ];
      if (newModel) {
        messages.push({
          role: "user",
          content: `Return the prompt constructor function for ${newModel} given the following prompt constructor function for ${originalModel}:\n---\n${originalVariant.constructFn}`,
        });
      }
      if (instructions) {
        messages.push({
          role: "user",
          content: `Follow these instructions: ${instructions}`,
        });
      }
      messages.push({
        role: "user",
        content: "The prompt variable has already been declared, so do not declare it again. Rewrite the entire prompt constructor function.",
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        functions: [
          {
            name: "update_prompt_constructor_function",
            parameters: {
              type: "object",
              properties: {
                new_prompt_function: {
                  type: "string",
                  description: "The new prompt function, runnable in typescript",
                },
              },
            },
          },
        ],
        function_call: {
          name: "update_prompt_constructor_function",
        },
      });
      const argString = completion.choices[0]?.message?.function_call?.arguments || "{}";

      const code = `
        global.contructPromptFunctionArgs = ${argString};
        `;

      const context = await isolate.createContext();

      const jail = context.global;
      await jail.set("global", jail.derefInto());

      const script = await isolate.compileScript(code);

      await script.run(context);
      const contructPromptFunctionArgs = (await context.global.get(
        "contructPromptFunctionArgs",
      )) as ivm.Reference;

      const args = await contructPromptFunctionArgs.copy(); // Get the actual value from the isolate

      if (args && isObject(args) && "new_prompt_function" in args) {
        newContructionFn = args.new_prompt_function as string;
        break;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return newContructionFn;
};
