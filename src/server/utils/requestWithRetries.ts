import { sleep } from "./sleep";

export async function requestWithRetries(
  requestCallback: () => Promise<Response>,
  numRetries = 3
): Promise<Response> {
  const minDelay = 500; // milliseconds
  const maxDelay = 5000; // milliseconds

  for (let i = 0; i < numRetries; i++) {
    const response = await requestCallback();

    if (response.status === 429) {
      // If the response status is 429 (rate limit), calculate delay and then retry
      const baseDelay = Math.min(maxDelay, minDelay * Math.pow(2, i));
      const jitter = Math.random() * baseDelay;
      const delay = baseDelay + jitter;

      await sleep(delay);
    } else if (!response.ok) {
      // If the response status is not ok (not 2xx), throw an error
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      // If successful, return the response
      return response;
    }
  }

  throw new Error("Maximum number of retries exceeded");
}
