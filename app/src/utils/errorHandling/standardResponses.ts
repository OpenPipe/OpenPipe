export function error(message: string): { status: "error"; message: string } {
  return {
    status: "error",
    message,
  };
}
export function success<T>(payload: T): { status: "success"; payload: T };
export function success(payload?: undefined): { status: "success"; payload: undefined };
export function success<T>(payload?: T) {
  return { status: "success", payload };
}
