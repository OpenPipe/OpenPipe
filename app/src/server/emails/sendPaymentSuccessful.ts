import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import PaymentSuccessful from "~/components/emails/PaymentSuccessful";
import { typedInvoice } from "~/types/dbColumns.types";
import { JsonValue } from "~/types/kysely-codegen.types";

export const sendPaymentSuccessful = async (
  invoiceId: string,
  amount: number,
  description: JsonValue,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const subject = `Payment Successful for ${projectName}`;
  const projectLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}`;
  const invoicesLink = `${projectLink}/billing/invoices`;
  const invoiceLink = `${invoicesLink}/${invoiceId}`;

  let typedDescription;
  try {
    ({ description: typedDescription } = typedInvoice({ description }));
  } catch (e) {
    return;
  }

  console.log("It runs");
  const emailBody = render(
    PaymentSuccessful({
      subject,
      amount: Number(Number(amount).toFixed(2)).toLocaleString(),
      projectName,
      description: typedDescription,
      projectLink,
      invoicesLink,
      invoiceLink,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject,
    body: emailBody,
  });
};
