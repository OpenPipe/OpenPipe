import modelProviders from "~/modelProviders/modelProviders";
import ivm from "isolated-vm";
import { isObject, isString } from "lodash-es";
import { type JsonObject } from "type-fest";
import { validate } from "jsonschema";

export type ParsedConstructFn<T extends keyof typeof modelProviders> = {
  modelProvider: T;
  model: keyof (typeof modelProviders)[T]["models"];
  modelInput: Parameters<(typeof modelProviders)[T]["getModel"]>[0];
};

const isolate = new ivm.Isolate({ memoryLimit: 128 });

export default async function parseConstructFn(
  constructFn: string,
  scenario: JsonObject | undefined = {},
): Promise<ParsedConstructFn<keyof typeof modelProviders> | { error: string }> {
  try {
    const modifiedConstructFn = constructFn.replace(
      "definePrompt(",
      "global.prompt = definePrompt(",
    );

    const code = `
    const scenario = ${JSON.stringify(scenario ?? {}, null, 2)};
    
    const definePrompt = (modelProvider, input) => ({
      modelProvider,
      input
    })

    ${modifiedConstructFn}
  `;

    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set("global", jail.derefInto());

    const script = await isolate.compileScript(code);
    await script.run(context);
    const promptReference = (await context.global.get("prompt")) as ivm.Reference;
    const prompt = await promptReference.copy();

    if (!isObject(prompt)) {
      return { error: "definePrompt did not return an object" };
    }
    if (!("modelProvider" in prompt) || !isString(prompt.modelProvider)) {
      return { error: "definePrompt did not return a valid modelProvider" };
    }

    const provider =
      prompt.modelProvider in modelProviders &&
      modelProviders[prompt.modelProvider as keyof typeof modelProviders];
    if (!provider) {
      return { error: "definePrompt did not return a known modelProvider" };
    }
    if (!("input" in prompt) || !isObject(prompt.input)) {
      return { error: "definePrompt did not return an input" };
    }

    const validationResult = validate(prompt.input, provider.inputSchema);
    if (!validationResult.valid)
      return {
        error: `definePrompt did not return a valid input: ${validationResult.errors
          .map((e) => e.stack)
          .join(", ")}`,
      };

    // We've validated the JSON schema so this should be safe
    const input = prompt.input as Parameters<(typeof provider)["getModel"]>[0];

    // @ts-expect-error TODO FIX ASAP
    const model = provider.getModel(input);
    if (!model) {
      return {
        error: `definePrompt did not return a known model for the provider ${prompt.modelProvider}`,
      };
    }

    return {
      modelProvider: prompt.modelProvider as keyof typeof modelProviders,
      // @ts-expect-error TODO FIX ASAP

      model,
      modelInput: input,
    };
  } catch (e) {
    const msg =
      isObject(e) && "message" in e && isString(e.message)
        ? e.message
        : "unknown error parsing definePrompt script";
    return { error: msg };
  }
}
