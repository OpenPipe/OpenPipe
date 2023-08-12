"use client";
import { type Session } from "next-auth";
import { useSession } from "next-auth/react";
import React, { ReactNode, useEffect } from "react";
import { PostHogProvider } from "posthog-js/react";

import posthog from "posthog-js";
import { env } from "~/env.mjs";
import { useRouter } from "next/router";

// Make sure we're in the browser
const inBrowser = typeof window !== "undefined";

export const PosthogAppProvider = ({ children }: { children: ReactNode }) => {
  const session = useSession().data;
  const router = useRouter();

  useEffect(() => {
    // Track page views
    const handleRouteChange = () => posthog?.capture("$pageview");
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    if (env.NEXT_PUBLIC_POSTHOG_KEY && inBrowser && session && session.user) {
      posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: `${env.NEXT_PUBLIC_HOST}/ingest`,
      });

      posthog.identify(session.user.id, {
        name: session.user.name,
        email: session.user.email,
      });
    }
  }, [session]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};
