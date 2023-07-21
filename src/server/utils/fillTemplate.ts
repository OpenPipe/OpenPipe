export type VariableMap = Record<string, string>;

// Escape quotes to match the way we encode JSON
export function escapeQuotes(str: string) {
  return str.replace(/(\\")|"/g, (match, p1) => (p1 ? match : '\\"'));
}

// Escape regex special characters
export function escapeRegExp(str: string) {
  return str.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function fillTemplate(template: string, variables: VariableMap): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => variables[key] || "");
}
