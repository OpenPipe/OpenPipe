import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import PaymentFailed from "~/components/emails/PaymentFailed";
import { Invoice } from "@prisma/client";
import { typedInvoice } from "~/types/dbColumns.types";

export const sendPaymentFailed = async (
  invoice: Invoice,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const subject = `Payment Required`;
  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}`;
  const invoicesLink = `${projectLink}/billing/invoices/${invoice.id}`;
  const paymentMethodsLink = `${projectLink}/billing/payment-methods`;

  let description;
  try {
    ({ description } = typedInvoice(invoice));
  } catch (e) {
    return;
  }

  const emailBody = render(
    PaymentFailed({
      projectName,
      amount: Number(Number(invoice.amount).toFixed(2)).toLocaleString(),
      paymentMethodsLink,
      invoicesLink,
      projectLink,
      billingPeriod: invoice.billingPeriod || "",
      description,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject,
    body: emailBody,
  });
};
