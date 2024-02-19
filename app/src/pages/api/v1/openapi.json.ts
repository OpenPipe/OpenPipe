import { type NextApiRequest, type NextApiResponse } from "next";
import { generateOpenApiDocument } from "trpc-openapi";
import { v1ApiRouter } from "~/server/api/external/v1Api/router";

export const openApiDocument = generateOpenApiDocument(v1ApiRouter, {
  title: "OpenPipe API",
  description: "The public API for reporting API calls to OpenPipe",
  version: "0.1.1",
  baseUrl: "https://app.openpipe.ai/api/v1",
});
// Respond with our OpenAPI schema
const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send(openApiDocument);
};

export default handler;
