type AxiosError = {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
};

export function isAxiosError(error: unknown): error is AxiosError {
  if (typeof error === "object" && error !== null) {
    // Initial check
    const err = error as AxiosError;
    return err.response?.data?.error?.message !== undefined; // Check structure
  }
  return false;
}
