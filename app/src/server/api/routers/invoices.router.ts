import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { requireCanViewProject } from "~/utils/accessControl";
import { TRPCError } from "@trpc/server";

export const invoicesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireCanViewProject(input.projectId, ctx);

      const invoices = await kysely
        .selectFrom("Invoice as i")
        .where("i.projectId", "=", input.projectId)
        .orderBy("i.createdAt", "desc")
        .selectAll()
        .execute();

      return invoices;
    }),
  get: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) throw new TRPCError({ message: "Invoice not found", code: "NOT_FOUND" });

      await requireCanViewProject(invoice.projectId, ctx);

      return invoice;
    }),
});
