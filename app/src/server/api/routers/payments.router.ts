import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { kysely, prisma } from "~/server/db";
import { v4 as uuidv4 } from "uuid";
import { requireCanModifyProject, requireCanViewProject } from "~/utils/accessControl";
import { success } from "~/utils/errorHandling/standardResponses";
import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { calculateSpendingsWithCredits } from "~/utils/billing";
import Stripe from "stripe";

export const paymentsRouter = createTRPCRouter({
  createStripeUser: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Create a specific rule?
      await requireCanModifyProject(input.projectId, ctx);

      try {
        if (process.env.STRIPE_SECRET_KEY === undefined)
          throw new Error("Stripe secret key not found"); // TODO: Refactor
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const customer = await stripe.customers.create({
          email: ctx.session.user.email ?? "test@test.test", // TODO: Store user or project data?
          name: ctx.session.user.name ?? "test",
          metadata: {
            projectId: input.projectId,
          },
        });

        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        return { client_secret: setupIntent.client_secret };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST", // TODO: Check if this is the correct code
          message: "Failed to create a Stripe customer.",
        });
      }
    }),
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
