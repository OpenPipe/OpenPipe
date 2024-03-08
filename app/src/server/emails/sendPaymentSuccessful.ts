import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import { typedInvoice } from "~/types/dbColumns.types";
import { type JsonValue } from "~/types/kysely-codegen.types";
import PaymentSuccessful from "./templates/PaymentSuccessful";

export const sendPaymentSuccessful = async (
  invoiceId: string,
  amount: number,
  description: JsonValue,
  billingPeriod: string,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}`;
  const invoicesLink = `${projectLink}/billing/invoices`;
  const invoiceLink = `${invoicesLink}/${invoiceId}`;

  let typedDescription;
  try {
    ({ description: typedDescription } = typedInvoice({ description }));
  } catch (e) {
    return;
  }

  const emailBody = render(
    PaymentSuccessful({
      amount: Number(amount).toFixed(2).toLocaleString(),
      projectName,
      description: typedDescription,
      billingPeriod,
      projectLink,
      invoicesLink,
      invoiceLink,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: `Payment Successful for ${projectName}`,
    body: emailBody,
  });
};
