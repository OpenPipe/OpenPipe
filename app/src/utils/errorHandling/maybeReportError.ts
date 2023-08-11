import { toast } from "~/theme/ChakraThemeProvider";
import { type error, type success } from "./standardResponses";

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
