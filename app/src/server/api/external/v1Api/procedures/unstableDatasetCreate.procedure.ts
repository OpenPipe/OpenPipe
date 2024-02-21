import { z } from "zod";

import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";

export const unstableDatasetCreate = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/unstable/dataset/create",
      description:
        "Create a new dataset. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(z.object({ name: z.string() }))
  .output(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    const dataset = await prisma.dataset.create({
      data: {
        projectId: ctx.key.projectId,
        name: input.name,
      },
    });

    return { id: dataset.id };
  });
