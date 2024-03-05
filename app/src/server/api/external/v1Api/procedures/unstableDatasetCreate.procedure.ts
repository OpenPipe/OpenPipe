import { z } from "zod";

import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";
import { prepareIntegratedDatasetCreation } from "~/server/utils/nodes/nodeCreation/prepareIntegratedNodesCreation";

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
  .output(z.object({ datasetId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    const preparedDatasetCreation = prepareIntegratedDatasetCreation({
      projectId: ctx.key.projectId,
      datasetName: input.name,
    });

    await prisma.$transaction(preparedDatasetCreation.prismaCreations);

    return { datasetId: preparedDatasetCreation.datasetId };
  });
