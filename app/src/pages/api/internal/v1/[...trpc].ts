import { type NextApiRequest, type NextApiResponse } from "next";
import cors from "nextjs-cors";
import { createOpenApiNextHandler } from "trpc-openapi";
import { v1ApiRouter } from "~/server/api/internal/v1Api.router";
import { createOpenApiContext } from "~/server/api/internal/openApiTrpc";

const openApiHandler = createOpenApiNextHandler({
  router: v1ApiRouter,
  createContext: createOpenApiContext,
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  await cors(req, res);

  return openApiHandler(req, res);
};

export default handler;
