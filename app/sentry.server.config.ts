// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as SentryModule from "@sentry/nextjs";
import { isError } from "lodash-es";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { ensureDefaultExport } from "~/utils/utils";

const Sentry = ensureDefaultExport(SentryModule);

if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.05,

    integrations: [
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      new Sentry.Integrations.Prisma({ client: prisma }),
    ],

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    environment: env.NEXT_PUBLIC_DEPLOY_ENV,
  });
} else {
  // Install local debug exception handler for rejected promises
  process.on("unhandledRejection", (reason) => {
    const reasonDetails = isError(reason) ? reason?.stack : reason;
    console.log("Unhandled Rejection at:", reasonDetails);
  });
}
