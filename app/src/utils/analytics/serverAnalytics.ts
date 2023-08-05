import { type Session } from "next-auth";
import { PostHog } from "posthog-node";
import { env } from "~/env.mjs";

export const posthogServerClient = env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: "https://app.posthog.com",
    })
  : null;

export const capturePath = (session: Session, path: string) => {
  if (!session.user || !posthogServerClient) return;
  posthogServerClient?.capture({ distinctId: session.user.id, event: path });
};
