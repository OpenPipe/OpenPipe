import { z } from "zod";

import { type Dataset } from "@prisma/client";
import { createFineTune } from "~/server/api/routers/fineTunes/createFineTune";
import { prisma } from "~/server/db";
import { openApiProtectedProc } from "../../openApiTrpc";
import { requireWriteKey } from "../helpers";

export const unstableFinetuneCreate = openApiProtectedProc
  .meta({
    openapi: {
      method: "POST",
      path: "/unstable/finetune/create",
      description:
        "Create a new finetune. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.",
      protect: true,
    },
  })
  .input(
    z.object({
      datasetId: z.string(),
      slug: z.string(),
      baseModel: z.union([
        z.literal("OpenPipe/mistral-ft-optimized-1227"),
        z.literal("meta-llama/Llama-2-13b-hf"),
        z.literal("mistralai/Mixtral-8x7B-Instruct-v0.1"),
        // TODO: add mistral instruct
      ]),
    }),
  )
  .output(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireWriteKey(ctx);

    const dataset: Dataset = await prisma.dataset.findUniqueOrThrow({
      where: { id: input.datasetId },
    });
    const owner = await prisma.projectUser.findFirstOrThrow({
      where: { projectId: dataset.projectId, role: "OWNER" },
    });

    const fineTune = await createFineTune({
      slug: input.slug,
      baseModel: {
        provider: "openpipe",
        baseModel: input.baseModel,
      },
      filters: [],
      pruningRuleIds: [],
      dataset,
      userId: owner.userId,
    });

    if (fineTune?.status === "error") {
      throw new Error(fineTune.message);
    }

    return { id: fineTune.id };
  });
