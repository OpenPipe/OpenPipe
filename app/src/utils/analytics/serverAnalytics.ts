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

export const captureFineTuneUsage = (
  projectId: string,
  model?: string,
  statusCode?: number,
  inputTokens?: number,
  outputTokens?: number,
  cost?: number,
) => {
  if (!posthogServerClient) return;
  posthogServerClient?.capture({
    distinctId: projectId,
    event: "fine-tune-usage",
    properties: {
      model,
      statusCode,
      inputTokens,
      outputTokens,
      cost,
    },
  });
};
