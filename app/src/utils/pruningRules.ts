export function escapeString(input: string | undefined) {
  // Remove first and last character, which are quotes
  return JSON.stringify(input || "").slice(1, -1);
}

export function escapeLikeString(input: string | undefined) {
  return escapeString(escapeString(input || ""));
}
