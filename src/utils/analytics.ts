// Make sure we're in the browser
import { type Session } from "next-auth";
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

export const identifySession = (session: Session) => {
  if (!enableAnalytics) return;
  posthog.identify(session.user?.id, {
    name: session.user.name,
    email: session.user.email,
  });
};
