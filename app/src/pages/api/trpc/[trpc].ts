import { createNextApiHandler } from "@trpc/server/adapters/next";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env.mjs";
import { appRouter } from "~/server/api/root.router";
import { createTRPCContext } from "~/server/api/trpc";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    if (env.NODE_ENV === "development")
      console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
    Sentry.captureException(error, { contexts: { trpc: { path } } });
  },
});
