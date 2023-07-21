import { type JsonValue } from "type-fest";
import { type OpenaiChatModelProvider } from ".";
import { type ModelProviderFrontend } from "../types";

const modelProviderFrontend: ModelProviderFrontend<OpenaiChatModelProvider> = {
  normalizeOutput: (output) => {
    const message = output.choices[0]?.message;
    if (!message)
      return {
        type: "json",
        value: output as unknown as JsonValue,
      };

    if (message.content) {
      return {
        type: "text",
        value: message.content,
      };
    } else if (message.function_call) {
      let args = message.function_call.arguments ?? "";
      try {
        args = JSON.parse(args);
      } catch (e) {
        // Ignore
      }
      return {
        type: "json",
        value: {
          ...message.function_call,
          arguments: args,
        },
      };
    } else {
      return {
        type: "json",
        value: message as unknown as JsonValue,
      };
    }
  },
};

export default modelProviderFrontend;
