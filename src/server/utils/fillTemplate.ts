export type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | JSONSerializable[]
  | { [key: string]: JSONSerializable };

export type VariableMap = Record<string, string>;

export default function fillTemplate<T extends JSONSerializable>(
  template: T,
  variables: VariableMap
): T {
  if (typeof template === "string") {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => variables[key] || "") as T;
  } else if (Array.isArray(template)) {
    return template.map((item) => fillTemplate(item, variables)) as T;
  } else if (typeof template === "object" && template !== null) {
    return Object.keys(template).reduce((acc, key) => {
      acc[key] = fillTemplate(template[key] as JSONSerializable, variables);
      return acc;
    }, {} as { [key: string]: JSONSerializable } & T);
  } else {
    return template;
  }
}
