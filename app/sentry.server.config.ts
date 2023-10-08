// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { isError } from "lodash-es";
import { env } from "~/env.mjs";

if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: env.NODE_ENV === "development" ? 1.0 : 0.1,
    instrumenter: "otel",

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
} else {
  // Install local debug exception handler for rejected promises
  process.on("unhandledRejection", (reason) => {
    const reasonDetails = isError(reason) ? reason?.stack : reason;
    console.log("Unhandled Rejection at:", reasonDetails);
  });
}
