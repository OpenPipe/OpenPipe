import { type JSONSerializable } from "../types";

export type VariableMap = Record<string, string>;

// Escape quotes to match the way we encode JSON
export function escapeQuotes(str: string) {
  return str.replace(/(\\")|"/g, (match, p1) => (p1 ? match : '\\"'));
}

// Escape regex special characters
export function escapeRegExp(str: string) {
  return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function fillTemplate(template: string, variables: VariableMap): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => variables[key] || "");
}

export function fillTemplateJson<T extends JSONSerializable>(
  template: T,
  variables: VariableMap,
): T {
  if (typeof template === "string") {
    return fillTemplate(template, variables) as T;
  } else if (Array.isArray(template)) {
    return template.map((item) => fillTemplateJson(item, variables)) as T;
  } else if (typeof template === "object" && template !== null) {
    return Object.keys(template).reduce(
      (acc, key) => {
        acc[key] = fillTemplateJson(template[key] as JSONSerializable, variables);
        return acc;
      },
      {} as { [key: string]: JSONSerializable } & T,
    );
  } else {
    return template;
  }
}
