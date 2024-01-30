import defineTask from "./defineTask";
import { prisma } from "~/server/db";
import { error, success } from "~/utils/errorHandling/standardResponses";
import {
  createStripePaymentIntent,
  getDefaultPaymentMethodId,
  getPaymentMethods,
  usdToCents,
} from "../utils/stripe";
import { env } from "~/env.mjs";

export const chargeInvoices = defineTask({
  id: "chargeInvoices",
  handler: async (task) => {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "PENDING",
      },
    });

    for (const invoice of invoices) {
      await chargeInvoice(invoice.id);
    }
  },
  specDefaults: {
    priority: 5,
  },
});

export async function chargeInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
  });

  if (invoice?.status !== "PENDING" || Number(invoice.amount) < 1) {
    return error("The invoice has already been paid.");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: invoice.projectId,
    },
  });

  if (!project || !project.stripeCustomerId) {
    return error("Add a default payment method.");
  }

  let paymentMethodToUse = await getDefaultPaymentMethodId(project.stripeCustomerId);

  if (!paymentMethodToUse) {
    // Search for available payment methods and use the first one
    const paymentMethods = await getPaymentMethods(project.stripeCustomerId);

    if (paymentMethods && paymentMethods.data[0]?.id) {
      paymentMethodToUse = paymentMethods.data[0]?.id;
    } else {
      return error("Add a payment method.");
    }
  }

  try {
    const paymentIntent = await createStripePaymentIntent({
      amount: usdToCents(invoice.amount),
      invoiceId: invoiceId,
      stripeCustomerId: project.stripeCustomerId,
      paymentMethodId: paymentMethodToUse,
      returnUrl: `${env.NEXT_PUBLIC_HOST}/p/${project?.slug}/billing/invoices`,
    });

    // Sometimes it will not work because processing may take some time.
    // In this case we will handle it using webhooks (see app/src/pages/api/stripe/webhook.ts)
    if (paymentIntent.status === "succeeded") {
      await prisma.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          paidAt: new Date(),
          status: "PAID",
          paymentId: paymentIntent.id,
        },
      });

      return success("Payment successfully applied.");
    }

    return error("Payment is processing.");
  } catch {
    return error("Failed to make a payment.");
  }
}
