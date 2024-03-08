import * as Sentry from "@sentry/nextjs";
import { type NextApiRequest, type NextApiResponse } from "next";
import cors from "nextjs-cors";
import { createOpenApiNextHandler } from "trpc-openapi";

import { createOpenApiContext } from "~/server/api/internal/openApiTrpc";
import { v1ApiRouter } from "~/server/api/internal/v1Api.router";

const openApiHandler = createOpenApiNextHandler({
  router: v1ApiRouter,
  createContext: createOpenApiContext,
  onError: ({ path, error }) => Sentry.captureException(error, { contexts: { trpc: { path } } }),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  await cors(req, res);

  return openApiHandler(req, res);
};

export default handler;
