import type { ApiKey, Project } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type NextApiResponse } from "next/types";
import superjson from "superjson";
import { type OpenApiMeta } from "trpc-openapi";
import { ZodError } from "zod";
import * as SentryModule from "@sentry/nextjs";
import { type IncomingHttpHeaders } from "http";

import { prisma } from "~/server/db";
import { ensureDefaultExport } from "~/utils/utils";

const Sentry = ensureDefaultExport(SentryModule);

type CreateContextOptions = {
  key:
    | (ApiKey & {
        project: Project;
      })
    | null;
  headers: IncomingHttpHeaders;
  res: NextApiResponse;
};

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    key: opts.key,
    headers: opts.headers,
    res: opts.res,
  };
};

export const createOpenApiContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  const apiKey = req.headers.authorization?.split(" ")[1] as string | null;

  if (!apiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const key = await prisma.apiKey.findFirst({
    where: { apiKey },
    include: { project: true },
  });
  if (!key) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return createInnerTRPCContext({
    key,
    headers: req.headers,
    res,
  });
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

const sentryMiddleware = t.middleware(async ({ ctx, next }) => {
  Sentry.Handlers.trpcMiddleware({
    attachRpcInput: true,
  });

  const owner = await prisma.projectUser.findFirst({
    where: {
      projectId: ctx.key?.projectId,
      role: "OWNER",
    },
  });

  owner && Sentry.setUser({ id: owner.id });
  const scope = Sentry.getIsolationScope();
  if (scope) {
    scope.setExtra("key", ctx.key);
    scope.setExtra("projectId", ctx.key?.projectId);
  }

  return next();
});

export const openApiPublicProc = t.procedure.use(sentryMiddleware);

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceApiKey = t.middleware(async ({ ctx, next }) => {
  if (!ctx.key) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: { key: ctx.key },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const openApiProtectedProc = t.procedure.use(sentryMiddleware.unstable_pipe(enforceApiKey));
