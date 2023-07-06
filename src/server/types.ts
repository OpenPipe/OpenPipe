export type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | JSONSerializable[]
  | { [key: string]: JSONSerializable };

// Placeholder for now
export type OpenAIChatConfig = NonNullable<JSONSerializable>;

export enum OpenAIChatModels {
  "gpt-4" = "gpt-4",
  "gpt-4-0613" = "gpt-4-0613",
  "gpt-4-32k" = "gpt-4-32k",
  "gpt-4-32k-0613" = "gpt-4-32k-0613",
  "gpt-3.5-turbo" = "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k" = "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0613" = "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k-0613" = "gpt-3.5-turbo-16k-0613",
}

type SupportedModel = keyof typeof OpenAIChatModels;