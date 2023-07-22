// Super hacky, but we'll redo the organization when we have more models

import { type SupportedProvider } from "~/modelProviders/types";
import { VscJson } from "react-icons/vsc";
import { TfiThought } from "react-icons/tfi";
import { type IconType } from "react-icons";

export type RefineOptionInfo = { icon: IconType; description: string; instructions: string };

export const refineOptions: Record<SupportedProvider, { [key: string]: RefineOptionInfo }> = {
  "openai/ChatCompletion": {
    "Add chain of thought": {
      icon: VscJson,
      description: "Asking the model to plan its answer can increase accuracy.",
      instructions: `Adding chain of thought means asking the model to think about its answer before it gives it to you. This is useful for getting more accurate answers. Do not add an assistant message.

    This is what a prompt looks like before adding chain of thought:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-4",
        stream: true,
        messages: [
            {
            role: "system",
            content: \`Evaluate sentiment.\`,
            },
            {
            role: "user",
            content: \`This is the user's message: \${scenario.user_message}. Return "positive" or "negative" or "neutral"\`,
            },
        ],
    });

    This is what one looks like after adding chain of thought:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-4",
        stream: true,
        messages: [
            {
            role: "system",
            content: \`Evaluate sentiment.\`,
            },
            {
            role: "user",
            content: \`This is the user's message: \${scenario.user_message}. Return "positive" or "negative" or "neutral". Explain your answer before you give a score, then return the score on a new line.\`,
            },
        ],
    });

    Here's another example:

    Before:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: \`Title: \${scenario.title}
      Body: \${scenario.body}

      Need: \${scenario.need}

      Rate likelihood on 1-3 scale.\`,
          },
        ],
        temperature: 0,
        functions: [
          {
            name: "score_post",
            parameters: {
              type: "object",
              properties: {
                score: {
                  type: "number",
                },
              },
            },
          },
        ],
        function_call: {
          name: "score_post",
        },
      });

    After:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: \`Title: \${scenario.title}
      Body: \${scenario.body}

      Need: \${scenario.need}

      Rate likelihood on 1-3 scale. Provide an explanation, but always provide a score afterward.\`,
          },
        ],
        temperature: 0,
        functions: [
          {
            name: "score_post",
            parameters: {
              type: "object",
              properties: {
                explanation: {
                  type: "string",
                }
                score: {
                  type: "number",
                },
              },
            },
          },
        ],
        function_call: {
          name: "score_post",
        },
      });

    Add chain of thought to the original prompt.`,
    },
    "Convert to function call": {
      icon: TfiThought,
      description: "Use function calls to get output from the model in a more structured way.",
      instructions: `OpenAI functions are a specialized way for an LLM to return output.

    This is what a prompt looks like before adding a function:

    definePrompt("openai/ChatCompletion", {
      model: "gpt-4",
      stream: true,
      messages: [
        {
          role: "system",
          content: \`Evaluate sentiment.\`,
        },
        {
          role: "user",
          content: \`This is the user's message: \${scenario.user_message}. Return "positive" or "negative" or "neutral"\`,
        },
      ],
    });

    This is what one looks like after adding a function:

    definePrompt("openai/ChatCompletion", {
      model: "gpt-4",
      stream: true,
      messages: [
        {
          role: "system",
          content: "Evaluate sentiment.",
        },
        {
          role: "user",
          content: scenario.user_message,
        },
      ],
      functions: [
        {
          name: "extract_sentiment",
          parameters: {
            type: "object", // parameters must always be an object with a properties key
            properties: { // properties key is required
              sentiment: {
                type: "string",
                description: "one of positive/negative/neutral",
              },
            },
          },
        },
      ],
      function_call: {
        name: "extract_sentiment",
      },
    });

    Here's another example of adding a function:

    Before:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: \`Here is the title and body of a reddit post I am interested in:

            title: \${scenario.title}
            body: \${scenario.body}

            On a scale from 1 to 3, how likely is it that the person writing this post has the following need? If you are not sure, make your best guess, or answer 1.

            Need: \${scenario.need}

            Answer one integer between 1 and 3.\`,
          },
        ],
        temperature: 0,
    });

    After:

    definePrompt("openai/ChatCompletion", {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: \`Title: \${scenario.title}
      Body: \${scenario.body}

      Need: \${scenario.need}

      Rate likelihood on 1-3 scale.\`,
          },
        ],
        temperature: 0,
        functions: [
          {
            name: "score_post",
            parameters: {
              type: "object",
              properties: {
                score: {
                  type: "number",
                },
              },
            },
          },
        ],
        function_call: {
          name: "score_post",
        },
      });

    Add an OpenAI function that takes one or more nested parameters that match the expected output from this prompt.`,
    },
  },
  "replicate/llama2": {},
};
