import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import { typedInvoice } from "~/types/dbColumns.types";
import { JsonValue } from "~/types/kysely-codegen.types";
import InvoiceNotification from "./templates/InvoiceNotification";

// We currently send this email when an invoice is FREE, but a user used the service.
// If invoice is payable, we send a payment success/failed email.
export const sendInvoiceNotification = async (
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
    InvoiceNotification({
      projectName,
      amount: Number(amount).toFixed(2).toLocaleString(),
      invoicesLink,
      projectLink,
      billingPeriod: billingPeriod || "",
      description: parsedDescription,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: `OpenPipe Invoice ${billingPeriod}`,
    body: emailBody,
  });
};
