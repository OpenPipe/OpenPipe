export default function userError(message: string): { status: "error"; message: string } {
  return {
    status: "error",
    message,
  };
}
