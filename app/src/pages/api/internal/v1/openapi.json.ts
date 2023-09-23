import { type NextApiRequest, type NextApiResponse } from "next";
import { generateOpenApiDocument } from "trpc-openapi";
import { v1ApiRouter } from "~/server/api/internal/v1Api.router";

export const openApiDocument = generateOpenApiDocument(v1ApiRouter, {
  title: "OpenPipe Internal API",
  description: "The internal API for trainer containers to query OpenPipe",
  version: "0.0.1",
  baseUrl: "https://app.openpipe.ai/api/internal/v1",
});
// Respond with our OpenAPI schema
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send(openApiDocument);
};

export default handler;
