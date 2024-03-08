import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import { typedInvoice } from "~/types/dbColumns.types";
import PaymentFailed from "./templates/PaymentFailed";
import { type JsonValue } from "~/types/kysely-codegen.types";

export const sendPaymentFailed = async (
  invoiceId: string,
  amount: number,
  description: JsonValue,
  billingPeriod: string,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}`;
  const invoicesLink = `${projectLink}/billing/invoices/${invoiceId}`;
  const paymentMethodsLink = `${projectLink}/billing/payment-methods`;

  let typedDescription;
  try {
    ({ description: typedDescription } = typedInvoice({ description }));
  } catch (e) {
    return;
  }

  const emailBody = render(
    PaymentFailed({
      projectName,
      amount: Number(amount).toFixed(2).toLocaleString(),
      paymentMethodsLink,
      invoicesLink,
      projectLink,
      billingPeriod,
      description: typedDescription,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: "Payment Required",
    body: emailBody,
  });
};
