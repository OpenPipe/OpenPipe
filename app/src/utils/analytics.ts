// Make sure we're in the browser
import posthog from "posthog-js";
import { env } from "~/env.mjs";

const enableAnalytics = typeof window !== "undefined";

if (enableAnalytics) {
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "https://app.posthog.com",
    });
  }
}
