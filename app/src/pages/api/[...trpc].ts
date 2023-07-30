import { type NextApiRequest, type NextApiResponse } from "next";
import cors from "nextjs-cors";
import { createOpenApiNextHandler } from "trpc-openapi";
import { createProcedureCache } from "trpc-openapi/dist/adapters/node-http/procedures";
import { appRouter } from "~/server/api/root.router";
import { createTRPCContext } from "~/server/api/trpc";

const openApiHandler = createOpenApiNextHandler({
  router: appRouter,
  createContext: createTRPCContext,
});

const cache = createProcedureCache(appRouter);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  await cors(req, res);

  return openApiHandler(req, res);
};

export default handler;
