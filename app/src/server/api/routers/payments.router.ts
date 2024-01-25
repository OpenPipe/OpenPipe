import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { requireCanViewProject } from "~/utils/accessControl";
import { success } from "~/utils/errorHandling/standardResponses";
import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { calculateSpendingsWithCredits } from "~/utils/billing";
import Stripe from "stripe";

export const paymentsRouter = createTRPCRouter({
  setupPaymentIntent: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const stripe = new Stripe("STRIPE_SECRET_KEY_HERE");

      return success("Successfully created invoice");
    }),
});
