import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import { typedInvoice } from "~/types/dbColumns.types";
import { JsonValue } from "~/types/kysely-codegen.types";
import InvoiceNotificationWithoutRequiredPayment from "./templates/InvoiceNotificationWithoutRequiredPayment";

export const sendInvoiceNotificationWithoutRequiredPayment = async (
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

  let parsedDescription;
  try {
    ({ description: parsedDescription } = typedInvoice({ description }));
  } catch (e) {
    return;
  }

  const emailBody = render(
    InvoiceNotificationWithoutRequiredPayment({
      projectName,
      amount: Number(Number(amount).toFixed(2)).toLocaleString(),
      invoicesLink,
      projectLink,
      billingPeriod: billingPeriod || "",
      description: parsedDescription,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: `OpenPipe Usage ${billingPeriod}`,
    body: emailBody,
  });
};
