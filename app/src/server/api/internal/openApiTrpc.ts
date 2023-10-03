import { TRPCError, initTRPC } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { type OpenApiMeta } from "trpc-openapi";
import { ZodError } from "zod";
import * as SentryModule from "@sentry/nextjs";

import { env } from "~/env.mjs";
import { ensureDefaultExport } from "~/utils/utils";

const Sentry = ensureDefaultExport(SentryModule);

export const createOpenApiContext = (opts: CreateNextContextOptions) => {
  const { req } = opts;

  const authenticatedSystemKey = req.headers.authorization?.split(" ")[1] as string | null;

  if (!authenticatedSystemKey) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing System Key" });
  }

  if (authenticatedSystemKey !== env.AUTHENTICATED_SYSTEM_KEY) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid System Key" });
  }

  return {};
};

export type TRPCContext = Awaited<ReturnType<typeof createOpenApiContext>>;

const t = initTRPC
  .context<typeof createOpenApiContext>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

export const createOpenApiRouter = t.router;

const sentryMiddleware = t.middleware(
  Sentry.Handlers.trpcMiddleware({
    attachRpcInput: true,
  }),
);

export const openApiProtectedProc = t.procedure.use(sentryMiddleware);
