import { v4 as uuidv4 } from "uuid";
import { type Prisma } from "@prisma/client";

import { prisma } from "~/server/db";

const MODEL_RESPONSE_TEMPLATES: {
  reqPayload: any;
  respPayload: any;
  respStatus: number;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
  tags: { name: string; value: string }[];
}[] = [
  {
    reqPayload: {
      model: "gpt-3.5-turbo-0613",
      messages: [
        {
          role: "system",
          content:
            "The user is testing multiple scenarios against the same prompt. Attempt to generate a new scenario that is different from the others.",
        },
        {
          role: "user",
          content:
            'Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *\n * You have access to the current scenario in the `scenario`\n * variable.\n */\n\ndefinePrompt("openai/ChatCompletion", {\n  model: "gpt-3.5-turbo-0613",\n  stream: true,\n  messages: [\n    {\n      role: "system",\n      content: `Write \'Start experimenting!\' in ${scenario.language}`,\n    },\n  ],\n});',
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"French"}',
          },
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"English"}',
          },
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"Spanish"}',
          },
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"German"}',
          },
        },
      ],
      functions: [
        {
          name: "add_scenario",
          parameters: {
            type: "object",
            properties: {
              language: { type: "string" },
            },
          },
        },
      ],
      temperature: 0.5,
      function_call: {
        name: "add_scenario",
      },
    },
    respStatus: 200,
    respPayload: {
      id: "chatcmpl-7",
      model: "gpt-3.5-turbo-0613",
      usage: {
        total_tokens: 241,
        prompt_tokens: 236,
        completion_tokens: 5,
      },
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            function_call: {
              name: "add_scenario",
              arguments: '{"language":"Italian"}',
            },
          },
          finish_reason: "stop",
        },
      ],
      created: 1691527579,
    },
    error: null,
    inputTokens: 236,
    outputTokens: 5,
    finishReason: "stop",
    tags: [{ name: "prompt_id", value: "add_scenario" }],
  },
  {
    reqPayload: {
      model: "gpt-3.5-turbo-0613",
      messages: [
        {
          role: "system",
          content:
            "The user is testing multiple scenarios against the same prompt. Attempt to generate a new scenario that is different from the others.",
        },
        {
          role: "user",
          content:
            'Prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *\n * You have access to the current scenario in the `scenario`\n * variable.\n */\n\ndefinePrompt("openai/ChatCompletion", {\n  model: "gpt-3.5-turbo-0613",\n  stream: true,\n  messages: [\n    {\n      role: "system",\n      content: `Write \'Start experimenting!\' in ${scenario.language}`,\n    },\n  ],\n});',
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"English"}',
          },
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"Spanish"}',
          },
        },
        {
          role: "assistant",
          content: null,
          function_call: {
            name: "add_scenario",
            arguments: '{"language":"German"}',
          },
        },
      ],
      functions: [
        {
          name: "add_scenario",
          parameters: {
            type: "object",
            properties: {
              language: { type: "string" },
            },
          },
        },
      ],
      temperature: 0.5,
      function_call: {
        name: "add_scenario",
      },
    },
    respStatus: 200,
    respPayload: {
      id: "chatcmpl-7",
      model: "gpt-3.5-turbo-0613",
      usage: {
        total_tokens: 227,
        prompt_tokens: 222,
        completion_tokens: 5,
      },
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            function_call: {
              name: "add_scenario",
              arguments: '{"language":"French"}',
            },
          },
          finish_reason: "stop",
        },
      ],
      created: 1691526949,
    },
    error: null,
    inputTokens: 222,
    outputTokens: 5,
    finishReason: "stop",
    tags: [],
  },
  {
    reqPayload: {
      model: "gpt-3.5-turbo-0613",
      stream: false,
      messages: [
        {
          role: "system",
          content: "Write 'Start experimenting!' in German",
        },
      ],
    },
    respStatus: 200,
    respPayload: {
      id: "chatcmpl-7",
      model: "gpt-3.5-turbo-0613",
      usage: {
        total_tokens: 21,
        prompt_tokens: 14,
        completion_tokens: 7,
      },
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Fang an zu experimentieren!",
          },
          finish_reason: "stop",
        },
      ],
      created: 1691526847,
    },
    error: null,
    inputTokens: 14,
    outputTokens: 7,
    finishReason: "stop",
    tags: [{ name: "prompt_id", value: "translate_text" }],
  },
  {
    reqPayload: {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            'Your job is to update prompt constructor functions. Here is the api shape for the current model:\n---\n{\n  "type": "object",\n  "properties": {\n    "model": {\n      "description": "ID of the model to use. See the [model endpoint compatibility](/docs/models/model-endpoint-compatibility) table for details on which models work with the Chat API.",\n      "example": "gpt-3.5-turbo",\n      "type": "string",\n      "enum": [\n        "gpt-4",\n        "gpt-4-0613",\n        "gpt-4-32k",\n        "gpt-4-32k-0613",\n        "gpt-3.5-turbo",\n        "gpt-3.5-turbo-16k",\n        "gpt-3.5-turbo-0613",\n        "gpt-3.5-turbo-16k-0613"\n      ]\n    },\n    "messages": {\n      "description": "A list of messages comprising the conversation so far. [Example Python code](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_format_inputs_to_ChatGPT_models.ipynb).",\n      "type": "array",\n      "minItems": 1,\n      "items": {\n        "type": "object",\n        "properties": {\n          "role": {\n            "type": "string",\n            "enum": [\n              "system",\n              "user",\n              "assistant",\n              "function"\n            ],\n            "description": "The role of the messages author. One of `system`, `user`, `assistant`, or `function`."\n          },\n          "content": {\n            "type": "string",\n            "description": "The contents of the message. `content` is required for all messages except assistant messages with function calls."\n          },\n          "name": {\n            "type": "string",\n            "description": "The name of the author of this message. `name` is required if role is `function`, and it should be the name of the function whose response is in the `content`. May contain a-z, A-Z, 0-9, and underscores, with a maximum length of 64 characters."\n          },\n          "function_call": {\n            "type": "object",\n            "description": "The name and arguments of a function that should be called, as generated by the model.",\n            "properties": {\n              "name": {\n                "type": "string",\n                "description": "The name of the function to call."\n              },\n              "arguments": {\n                "type": "string",\n                "description": "The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function."\n              }\n            }\n          }\n        },\n        "required": [\n          "role"\n        ]\n      }\n    },\n    "functions": {\n      "description": "A list of functions the model may generate JSON inputs for.",\n      "type": "array",\n      "minItems": 1,\n      "items": {\n        "type": "object",\n        "properties": {\n          "name": {\n            "type": "string",\n            "description": "The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64."\n          },\n          "description": {\n            "type": "string",\n            "description": "The description of what the function does."\n          },\n          "parameters": {\n            "type": "object",\n            "description": "The parameters the functions accepts, described as a JSON Schema object. See the [guide](/docs/guides/gpt/function-calling) for examples, and the [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for documentation about the format.",\n            "additionalProperties": true\n          }\n        },\n        "required": [\n          "name"\n        ]\n      }\n    },\n    "function_call": {\n      "description": "Controls how the model responds to function calls. \\"none\\" means the model does not call a function, and responds to the end-user. \\"auto\\" means the model can pick between an end-user or calling a function.  Specifying a particular function via `{\\"name\\":\\\\ \\"my_function\\"}` forces the model to call that function. \\"none\\" is the default when no functions are present. \\"auto\\" is the default if functions are present.",\n      "oneOf": [\n        {\n          "type": "string",\n          "enum": [\n            "none",\n            "auto"\n          ]\n        },\n        {\n          "type": "object",\n          "properties": {\n            "name": {\n              "type": "string",\n              "description": "The name of the function to call."\n            }\n          },\n          "required": [\n            "name"\n          ]\n        }\n      ]\n    },\n    "temperature": {\n      "type": "number",\n      "minimum": 0,\n      "maximum": 2,\n      "default": 1,\n      "example": 1,\n      "nullable": true,\n      "description": "What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.\\n\\nWe generally recommend altering this or `top_p` but not both.\\n"\n    },\n    "top_p": {\n      "type": "number",\n      "minimum": 0,\n      "maximum": 1,\n      "default": 1,\n      "example": 1,\n      "nullable": true,\n      "description": "An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.\\n\\nWe generally recommend altering this or `temperature` but not both.\\n"\n    },\n    "n": {\n      "type": "integer",\n      "minimum": 1,\n      "maximum": 128,\n      "default": 1,\n      "example": 1,\n      "nullable": true,\n      "description": "How many chat completion choices to generate for each input message."\n    },\n    "stream": {\n      "description": "If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format) as they become available, with the stream terminated by a `data: [DONE]` message. [Example Python code](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_stream_completions.ipynb).\\n",\n      "type": "boolean",\n      "nullable": true,\n      "default": false\n    },\n    "stop": {\n      "description": "Up to 4 sequences where the API will stop generating further tokens.\\n",\n      "default": null,\n      "oneOf": [\n        {\n          "type": "string",\n          "nullable": true\n        },\n        {\n          "type": "array",\n          "minItems": 1,\n          "maxItems": 4,\n          "items": {\n            "type": "string"\n          }\n        }\n      ]\n    },\n    "max_tokens": {\n      "description": "The maximum number of [tokens](/tokenizer) to generate in the chat completion.\\n\\nThe total length of input tokens and generated tokens is limited by the model\'s context length. [Example Python code](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb) for counting tokens.\\n",\n      "type": "integer"\n    },\n    "presence_penalty": {\n      "type": "number",\n      "default": 0,\n      "minimum": -2,\n      "maximum": 2,\n      "nullable": true,\n      "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.\\n\\n[See more information about frequency and presence penalties.](/docs/api-reference/parameter-details)\\n"\n    },\n    "frequency_penalty": {\n      "type": "number",\n      "default": 0,\n      "minimum": -2,\n      "maximum": 2,\n      "nullable": true,\n      "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model\'s likelihood to repeat the same line verbatim.\\n\\n[See more information about frequency and presence penalties.](/docs/api-reference/parameter-details)\\n"\n    },\n    "logit_bias": {\n      "type": "object",\n      "x-oaiTypeLabel": "map",\n      "default": null,\n      "nullable": true,\n      "description": "Modify the likelihood of specified tokens appearing in the completion.\\n\\nAccepts a json object that maps tokens (specified by their token ID in the tokenizer) to an associated bias value from -100 to 100. Mathematically, the bias is added to the logits generated by the model prior to sampling. The exact effect will vary per model, but values between -1 and 1 should decrease or increase likelihood of selection; values like -100 or 100 should result in a ban or exclusive selection of the relevant token.\\n"\n    },\n    "user": {\n      "type": "string",\n      "example": "user-1234",\n      "description": "A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. [Learn more](/docs/guides/safety-best-practices/end-user-ids).\\n"\n    }\n  },\n  "required": [\n    "model",\n    "messages"\n  ]\n}\n\nDo not add any assistant messages.',
        },
        {
          role: "user",
          content:
            'This is the current prompt constructor function:\n---\n/**\n * Use Javascript to define an OpenAI chat completion\n * (https://platform.openai.com/docs/api-reference/chat/create).\n *\n * You have access to the current scenario in the `scenario`\n * variable.\n */\n\ndefinePrompt("openai/ChatCompletion", {\n  model: "gpt-3.5-turbo-0613",\n  stream: true,\n  messages: [\n    {\n      role: "system",\n      content: `Write \'Start experimenting!\' in ${scenario.language}`,\n    },\n  ],\n});',
        },
        {
          role: "user",
          content:
            "Return the prompt constructor function for LLama 2 7B Chat given the existing prompt constructor function for GPT-3.5 Turbo",
        },
        {
          role: "user",
          content:
            'As seen in the first argument to definePrompt, the old provider endpoint was "openai/ChatCompletion". The new provider endpoint is "replicate/llama2". Here is the schema for the new model:\n---\n{\n  "type": "object",\n  "properties": {\n    "model": {\n      "type": "string",\n      "enum": [\n        "7b-chat",\n        "13b-chat",\n        "70b-chat"\n      ]\n    },\n    "system_prompt": {\n      "type": "string",\n      "description": "System prompt to send to Llama v2. This is prepended to the prompt and helps guide system behavior."\n    },\n    "prompt": {\n      "type": "string",\n      "description": "Prompt to send to Llama v2."\n    },\n    "max_new_tokens": {\n      "type": "number",\n      "description": "Maximum number of tokens to generate. A word is generally 2-3 tokens (minimum: 1)"\n    },\n    "temperature": {\n      "type": "number",\n      "description": "Adjusts randomness of outputs, 0.1 is a good starting value. (minimum: 0.01; maximum: 5)"\n    },\n    "top_p": {\n      "type": "number",\n      "description": "When decoding text, samples from the top p percentage of most likely tokens; lower to ignore less likely tokens (minimum: 0.01; maximum: 1)"\n    },\n    "repetition_penalty": {\n      "type": "number",\n      "description": "Penalty for repeated words in generated text; 1 is no penalty, values greater than 1 discourage repetition, less than 1 encourage it. (minimum: 0.01; maximum: 5)"\n    },\n    "debug": {\n      "type": "boolean",\n      "description": "provide debugging output in logs"\n    }\n  },\n  "required": [\n    "model",\n    "prompt"\n  ]\n}',
        },
      ],
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
    },
    respStatus: 200,
    respPayload: {
      id: "chatcmpl-7",
      model: "gpt-4-0613",
      usage: {
        total_tokens: 2910,
        prompt_tokens: 2802,
        completion_tokens: 108,
      },
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            function_call: {
              name: "update_prompt_constructor_function",
              arguments:
                '{\n  "new_prompt_function": "definePrompt(\\"replicate/llama2\\", {\\n  model: \\"7b-chat\\",\\n  system_prompt: `Write \'Start experimenting!\' in ${scenario.language}`,\\n  prompt: `Experiment with the Llama v2 model`,\\n  max_new_tokens: 100,\\n  temperature: 0.1,\\n  top_p: 0.95,\\n  repetition_penalty: 1.2,\\n  debug: true,\\n});"\n}',
            },
          },
          finish_reason: "stop",
        },
      ],
      created: 1691537451,
    },
    error: null,
    inputTokens: 2802,
    outputTokens: 108,
    finishReason: "stop",
    tags: [
      { name: "prompt_id", value: "define_func" },
      { name: "some_other_tag", value: "some_other_value" },
    ],
  },
];

const project = await prisma.project.findFirst({
  where: {
    personalProjectUserId: {
      not: null,
    },
  },
  orderBy: {
    createdAt: "asc",
  },
});

if (!project) {
  console.error("No project found. Sign up to create your first project.");
  process.exit(1);
}

const loggedCallsToCreate: Prisma.LoggedCallCreateManyInput[] = [];
const loggedCallTagsToCreate: Prisma.LoggedCallTagCreateManyInput[] = [];
for (let i = 0; i < 11437; i++) {
  const loggedCallId = uuidv4();
  const template =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    MODEL_RESPONSE_TEMPLATES[Math.floor(Math.random() * MODEL_RESPONSE_TEMPLATES.length)]!;
  const model = template.reqPayload.model;
  // choose random time in the last two weeks, with a bias towards the last few days
  const requestedAt = new Date(Date.now() - Math.pow(Math.random(), 2) * 1000 * 60 * 60 * 24 * 14);
  // choose random delay anywhere from 2 to 10 seconds later for gpt-4, or 1 to 5 seconds for gpt-3.5
  const delay =
    model === "gpt-4" ? 1000 * 2 + Math.random() * 1000 * 8 : 1000 + Math.random() * 1000 * 4;
  const receivedAt = new Date(requestedAt.getTime() + delay);

  const { promptTokenPrice, completionTokenPrice } =
    model === "gpt-4"
      ? {
          promptTokenPrice: 0.00003,
          completionTokenPrice: 0.00006,
        }
      : {
          promptTokenPrice: 0.0000015,
          completionTokenPrice: 0.000002,
        };

  loggedCallsToCreate.push({
    id: loggedCallId,
    requestedAt,
    receivedAt,
    reqPayload: template.reqPayload,
    respPayload: template.respPayload,
    statusCode: template.respStatus,
    errorMessage: template.error,
    durationMs: receivedAt.getTime() - requestedAt.getTime(),
    inputTokens: template.inputTokens,
    outputTokens: template.outputTokens,
    finishReason: template.finishReason,
    cost: template.inputTokens * promptTokenPrice + template.outputTokens * completionTokenPrice,
    projectId: project.id,
    model: template.reqPayload.model,
    createdAt: requestedAt,
  });

  for (const tag of template.tags) {
    loggedCallTagsToCreate.push({
      projectId: project.id,
      loggedCallId,
      name: tag.name,
      value: tag.value,
    });
  }
}

await prisma.loggedCall.createMany({
  data: loggedCallsToCreate,
});
