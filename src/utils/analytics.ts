import { type Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import posthog from "posthog-js";
import { env } from "~/env.mjs";

// Make sure we're in the browser
const enableBrowserAnalytics = typeof window !== "undefined";
if (enableBrowserAnalytics) {
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: `${env.NEXT_PUBLIC_HOST}/ingest`,
    });
  }
}

export const identifySession = (session: Session) => {
  if (!session.user) return;
  posthog.identify(session.user.id, {
    name: session.user.name,
    email: session.user.email,
  });
};

export const SessionIdentifier = () => {
  const session = useSession().data;
  useEffect(() => {
    if (session && enableBrowserAnalytics) identifySession(session);
  }, [session]);
  return null;
};
