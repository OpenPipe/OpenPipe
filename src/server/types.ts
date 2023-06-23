export type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | JSONSerializable[]
  | { [key: string]: JSONSerializable };

// Placeholder for now
export type OpenAIChatConfig = NonNullable<JSONSerializable>;
