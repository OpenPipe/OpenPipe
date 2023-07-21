import { type JsonValue } from "type-fest";
import { type SupportedModel } from ".";
import { type FrontendModelProvider } from "../types";
import { type ChatCompletion } from "openai/resources/chat";

const frontendModelProvider: FrontendModelProvider<SupportedModel, ChatCompletion> = {
  name: "OpenAI ChatCompletion",

  models: {
    "gpt-4-0613": {
      name: "GPT-4",
      learnMore: "https://openai.com/gpt-4",
    },
    "gpt-4-32k-0613": {
      name: "GPT-4 32k",
      learnMore: "https://openai.com/gpt-4",
    },
    "gpt-3.5-turbo-0613": {
      name: "GPT-3.5 Turbo",
      learnMore: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
    "gpt-3.5-turbo-16k-0613": {
      name: "GPT-3.5 Turbo 16k",
      learnMore: "https://platform.openai.com/docs/guides/gpt/chat-completions-api",
    },
  },

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

export default frontendModelProvider;
