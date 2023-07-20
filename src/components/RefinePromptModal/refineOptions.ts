// Super hacky, but we'll redo the organization when we have more models

export type RefineOptionLabel = "Add chain of thought" | "Convert to function call";

export const refineOptions: Record<
  RefineOptionLabel,
  { description: string; instructions: string }
> = {
  "Add chain of thought": {
    description: "Asks the model to think about its answer before it gives it to you.",
    instructions: `Adding chain of thought means asking the model to think about its answer before it gives it to you. This is useful for getting more accurate answers. Do not add an assistant message.
      
      Add chain of thought to the original prompt.`,
  },
  "Convert to function call": {
    description: "Converts the prompt to a function call.",
    instructions: `Function calls are a specific way for an LLM to return output. This is what a prompt looks like without using function calls:
    
    prompt = {
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
    };
  
    This is what one looks like using function calls:
  
    prompt = {
      model: "gpt-3.5-turbo-0613",
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
    };  
    
    Add a function call that takes one or more nested parameters.`,
  },
};
