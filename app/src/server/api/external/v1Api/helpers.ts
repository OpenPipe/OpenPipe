import { TRPCError } from "@trpc/server";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { type TRPCContext } from "../openApiTrpc";

export const requireWriteKey = async (ctx: TRPCContext) => {
  if (!ctx.key)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must provide an API key to call this operation",
    });

  if (ctx.key?.readOnly) {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: ctx.key.projectId },
      select: { slug: true },
    });

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: `You are trying to call a write operation with a read-only API key. Please view your project settings at ${env.NEXT_PUBLIC_HOST}/p/${project.slug}/settings and choose the "Read/Write" key.`,
    });
  }
};
