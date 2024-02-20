import { z } from "zod";

import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";
import { type Dataset } from "@prisma/client";
import { pick } from "lodash-es";
import { baseModel } from "~/server/fineTuningProviders/types";
import { createFineTune } from "~/server/api/routers/fineTunes/createFineTune";

export const unstableFinetuneCreate = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/unstable/finetune/create",
      description:
        "Create a new fine tune. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(
    z.object({
      datasetId: z.string(),
      slug: z.string(),
      baseModel,
    }),
  )
  .output(z.object({ fineTuneId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    const dataset: Dataset = await prisma.dataset.findUniqueOrThrow({
      where: { id: input.datasetId },
    });
    const owner = await prisma.projectUser.findFirstOrThrow({
      where: { projectId: dataset.projectId, role: "OWNER" },
    });

    const fineTune = await createFineTune({
      ...pick(input, ["slug", "baseModel"]),
      filters: [],
      pruningRuleIds: [],
      dataset,
      userId: owner.userId,
    });

    if (fineTune?.status === "error") {
      throw new Error(fineTune.message);
    }

    return { fineTuneId: fineTune.id };
  });
