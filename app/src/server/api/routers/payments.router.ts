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

export const paymentsRouter = createTRPCRouter({
  createStripeCustomer: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

      const stripeCustomerId = await getStripeCustomerId({
        projectId: input.projectId,
        required: false,
      });

      if (stripeCustomerId) {
        return success("Stripe customer already created.");
      }

      try {
        await createStripeCustomerAndConnectItToProject(input.projectId);
        return success("Stripe customer created successfully!");
      } catch {
        return error("Failed to create a stripe customer.");
      }
    }),
  createStripeIntent: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireIsProjectAdmin(input.projectId, ctx);

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
        required: true,
      });

      try {
        const paymentMethods = await getPaymentMethods(stripeCustomerId);

        if (!paymentMethods) {
          return null;
        }

        // Set initial payment method as default
        let defaultPaymentMethodId = await getDefaultPaymentMethodId(stripeCustomerId);
        const availablePaymentMethodId = paymentMethods.data[0]?.id ?? undefined;
        if (defaultPaymentMethodId === undefined && availablePaymentMethodId) {
          await setDefaultPaymentMethod(stripeCustomerId, availablePaymentMethodId);
          defaultPaymentMethodId = availablePaymentMethodId;
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
        console.log(response);
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
