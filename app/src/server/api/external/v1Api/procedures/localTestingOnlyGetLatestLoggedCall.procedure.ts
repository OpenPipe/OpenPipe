import { z } from "zod";

import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";

export const localTestingOnlyGetLatestLoggedCall = openApiProtectedProc
  .meta({
    openapi: {
      method: "GET",
      path: "/local-testing-only-get-latest-logged-call",
      description: "Get the latest logged call (only for local testing)",
      protect: true, // Make sure to protect this endpoint
    },
  })
  .input(z.void())
  .output(
    z
      .object({
        createdAt: z.date(),
        cacheHit: z.boolean(),
        statusCode: z.number().nullable(),
        errorMessage: z.string().nullable(),
        reqPayload: z.unknown(),
        respPayload: z.unknown(),
        tags: z.record(z.string().nullable()),
      })
      .nullable(),
  )
  .mutation(async ({ ctx }) => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("This operation is not allowed in production environment");
    }

    const latestLoggedCall = await prisma.loggedCall.findFirst({
      where: { projectId: ctx.key.projectId },
      orderBy: { requestedAt: "desc" },
      select: {
        createdAt: true,
        cacheHit: true,
        tags: true,
        id: true,
        statusCode: true,
        errorMessage: true,
        reqPayload: true,
        respPayload: true,
      },
    });

    return (
      latestLoggedCall && {
        ...latestLoggedCall,
        tags: Object.fromEntries(latestLoggedCall.tags.map((tag) => [tag.name, tag.value])),
      }
    );
  });
