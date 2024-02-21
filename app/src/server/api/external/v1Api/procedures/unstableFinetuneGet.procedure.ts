import { z } from "zod";
import { pick } from "lodash-es";

import { type FineTune } from "@prisma/client";
import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";

export const unstableFinetuneGet = openApiProtectedProc
  .meta({
    openapi: {
      method: "GET",
      path: "/unstable/finetune/get",
      description:
        "Get a finetune by ID. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(z.object({ fineTuneId: z.string() }))
  .output(
    z.object({
      id: z.string(),
      status: z.union([
        z.literal("PENDING"),
        z.literal("STARTED"),
        z.literal("TRANSFERRING_TRAINING_DATA"),
        z.literal("TRAINING"),
        z.literal("DEPLOYED"),
        z.literal("ERROR"),
      ]),
      slug: z.string(),
      baseModel: z.string(),
      errorMessage: z.string().nullable(),
      datasetId: z.string(),
      createdAt: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const fineTune: FineTune = await prisma.fineTune.findFirstOrThrow({
      where: { id: input.fineTuneId, projectId: ctx.key.projectId },
    });

    return {
      ...pick(fineTune, ["id", "status", "slug", "baseModel", "errorMessage", "datasetId"]),
      createdAt: fineTune.createdAt.toISOString(),
    };
  });
