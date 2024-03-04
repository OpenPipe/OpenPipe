import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireIsProjectAdmin, requireNothing } from "~/utils/accessControl";
import { error, success } from "~/utils/errorHandling/standardResponses";
import { TRPCError } from "@trpc/server";
import {
  createStripeCustomerAndConnectItToProject,
  getDefaultPaymentMethodId,
  getPaymentMethods,
  getStripeCustomerId,
  setDefaultPaymentMethod,
  createSetupIntent,
  getStripeCustomer,
  deletePaymentMethod,
} from "~/server/utils/stripe";
import { chargeInvoice } from "~/server/tasks/chargeInvoices.task";
import { prisma } from "~/server/db";
import { CONCURRENCY_RATE_LIMITS } from "~/utils/rateLimit/const";

export const paymentsRouter = createTRPCRouter({
  createStripeIntent: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const stripeCustomerExists = await getStripeCustomerId({
        projectId: input.projectId,
        required: false,
      });

      if (!stripeCustomerExists) {
        try {
          await createStripeCustomerAndConnectItToProject(input.projectId);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST", // TODO: Check if this is the correct code
            message: "Failed to create a Stripe customer.",
          });
        }
      }

      let stripeCustomerId = await getStripeCustomerId({
        projectId: input.projectId,
        required: true,
      });

      // Check if stripe user was deleted. If yes - create a new one
      const stripeUser = await getStripeCustomer(stripeCustomerId);
      if (stripeUser.deleted) {
        const newStripeUser = await createStripeCustomerAndConnectItToProject(input.projectId);
        stripeCustomerId = newStripeUser.id;
      }

      try {
        const setupIntent = await createSetupIntent(stripeCustomerId);

        return { clientSecret: setupIntent.client_secret };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST", // TODO: Check if this is the correct code
          message: "Failed to create a Stripe intent.",
        });
      }
    }),
  getPaymentMethods: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const stripeCustomerId = await getStripeCustomerId({
        projectId: input.projectId,
        required: false,
      });

      if (!stripeCustomerId) {
        return null;
      }

      try {
        const paymentMethods = await getPaymentMethods(stripeCustomerId);

        if (!paymentMethods) {
          return null;
        }

        // Set initial payment method as default
        let defaultPaymentMethodId = await getDefaultPaymentMethodId(stripeCustomerId);
        const availablePaymentMethodId = paymentMethods.data[0]?.id ?? undefined;
        if (!defaultPaymentMethodId && availablePaymentMethodId) {
          await setDefaultPaymentMethod(stripeCustomerId, availablePaymentMethodId);
          defaultPaymentMethodId = availablePaymentMethodId;
        }

        // Update Rate Limit after a payment method is added
        if (paymentMethods.data.length) {
          const project = await prisma.project.findUniqueOrThrow({
            where: { id: input.projectId },
          });

          if (project.rateLimit === CONCURRENCY_RATE_LIMITS.BASE_LIMIT) {
            await prisma.project.update({
              where: { id: input.projectId },
              data: { rateLimit: CONCURRENCY_RATE_LIMITS.INCREASED_LIMIT },
            });
          }
        }

        return { data: paymentMethods.data, defaultPaymentMethodId };
      } catch {
        throw new Error("Failed to get payment methods.");
      }
    }),
  setDefaultPaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const stripeCustomerId = await getStripeCustomerId({
        projectId: input.projectId,
        required: true,
      });

      try {
        const response = setDefaultPaymentMethod(stripeCustomerId, input.paymentMethodId);
        return success("Default payment method set successfully!");
      } catch {
        return error("Failed to set a default payment method.");
      }
    }),
  deletePaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const stripeCustomerId = await getStripeCustomerId({
        projectId: input.projectId,
        required: true,
      });

      const defaultPaymentMethodId = await getDefaultPaymentMethodId(stripeCustomerId);

      // Prevent deleting default payment method
      if (defaultPaymentMethodId === input.paymentMethodId) {
        return error("Add a new default payment method first");
      }

      try {
        await deletePaymentMethod(input.paymentMethodId);
        return success("Payment method deleted successfully!");
      } catch {
        return error("Failed to delete a payment method.");
      }
    }),
  pay: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      requireNothing(ctx);

      return chargeInvoice(input.invoiceId);
    }),
});
