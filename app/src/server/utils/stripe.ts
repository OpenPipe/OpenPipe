import Stripe from "stripe";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { TRPCError } from "@trpc/server";
import { type Decimal } from "@prisma/client/runtime/library";

const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "");

export async function createStripePaymentIntent({
  amount,
  stripeCustomerId,
  paymentMethodId,
  returnUrl,
  invoiceId,
}: {
  amount: number;
  stripeCustomerId: string;
  paymentMethodId: string;
  returnUrl: string;
  invoiceId: string;
}) {
  return stripe.paymentIntents.create({
    amount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    return_url: returnUrl,
    off_session: true,
    confirm: true,
    metadata: {
      invoiceId, // Used to track status using webhooks
    },
  });
}
export const createSetupIntent = async (stripeCustomerId: string) =>
  stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: "off_session",
    automatic_payment_methods: {
      enabled: true,
    },
  });

export const getStripeCustomer = async (stripeCustomerId: string) =>
  stripe.customers.retrieve(stripeCustomerId);

export const deletePaymentMethod = async (paymentMethodId: string) =>
  stripe.paymentMethods.detach(paymentMethodId);

export async function getDefaultPaymentMethodId(stripeCustomerId: string) {
  const customer = await stripe.customers.retrieve(stripeCustomerId);

  if (customer.deleted) {
    return undefined;
  }

  const paymentMethodId = customer.invoice_settings.default_payment_method;
  if (!paymentMethodId || typeof paymentMethodId !== "string") {
    return undefined;
  }

  return paymentMethodId;
}

export const setDefaultPaymentMethod = async (stripeCustomerId: string, paymentMethodId: string) =>
  stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

export async function getPaymentMethods(stripeCustomerId: string) {
  const customer = await stripe.customers.retrieve(stripeCustomerId);

  if (customer.deleted) {
    return undefined;
  }

  return await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });
}

export function usdToCents(usd: number | Decimal) {
  const cents = Math.round(Number(usd) * 100);
  return cents >= 0 ? cents : 0;
}

export async function createStripeCustomerAndConnectItToProject(projectId: string) {
  // Find a project
  const project = await prisma.project.findFirstOrThrow({
    where: {
      id: projectId,
    },
  });

  // Create stripe customer
  const customer = await stripe.customers.create({
    name: `${project.name} - ${project.slug}`,
    metadata: {
      projectId: projectId,
    },
  });

  // Associate customer with a project
  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer;
}

// Overload signatures
export function getStripeCustomerId(input: { projectId: string; required: true }): Promise<string>;
export function getStripeCustomerId(input: {
  projectId: string;
  required: false;
}): Promise<string | null>;
export async function getStripeCustomerId(input: { projectId: string; required: boolean }) {
  const project = await prisma.project.findUnique({
    where: {
      id: input.projectId,
    },
  });

  if (!project || (input.required && !project.stripeCustomerId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Setup a stripe customer id first.",
    });
  }

  return project.stripeCustomerId;
}
