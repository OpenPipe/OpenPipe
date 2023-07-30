import { type NextApiRequest, type NextApiResponse } from "next";
import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "~/server/api/root.router";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "OpenPipe API",
  description: "The public API for reporting API calls to OpenPipe",
  version: "0.1.0",
  baseUrl: "https://app.openpipe.ai/api",
});
// Respond with our OpenAPI schema
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send(openApiDocument);
};

export default handler;
