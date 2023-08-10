import { toast } from "~/theme/ChakraThemeProvider";

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

type SuccessType<T> = ReturnType<typeof success<T>>;
type ErrorType = ReturnType<typeof error>;

// Used client-side to report generic errors
export function maybeReportError<T>(response: SuccessType<T> | ErrorType): response is ErrorType {
  if (response.status === "error") {
    toast({
      description: response.message,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    return true;
  }

  return false;
}
