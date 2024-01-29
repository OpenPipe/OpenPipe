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
import { emailAdminsAboutPaymentFailure } from "../utils/emails";

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

  let defaultPaymentMethodId = await getDefaultPaymentMethodId(project.stripeCustomerId);

  if (!defaultPaymentMethodId) {
    // Search for available payment methods and use the first one
    const paymentMethods = await getPaymentMethods(project.stripeCustomerId);

    if (paymentMethods && paymentMethods.data[0]?.id) {
      defaultPaymentMethodId = paymentMethods.data[0]?.id;
    } else {
      return error("Add a default payment method.");
    }
  }

  try {
    const paymentIntent = await createStripePaymentIntent({
      amount: usdToCents(invoice.amount),
      invoiceId: invoiceId,
      stripeCustomerId: project.stripeCustomerId,
      paymentMethodId: defaultPaymentMethodId,
      returnUrl: `${
        env.NEXT_PUBLIC_HOST ?? "app.openpipe.com"
      }/p/${project?.slug}/billing/inboices`,
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

      return success("Payment is succeeded!");
    }

    return error("Peyment is processing");
  } catch {
    // Send email to admins about payment failure
    await emailAdminsAboutPaymentFailure(project.id, project.name, project.slug);

    return error("Failed to make a payment.");
  }
}
