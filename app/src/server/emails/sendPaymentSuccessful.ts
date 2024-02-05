import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";

export const sendPaymentSuccessful = async (
  amount: number,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const paymentMethodsLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}/billing/invoices`;

  const emailBody = `
  <p>Your payment of $${amount.toFixed(
    2,
  )} for project "${projectName}" has been successfully processed.</p>
  <p>You can review your payment details by clicking <a href="${paymentMethodsLink}">here</a>.</p>
`;

  await sendEmail({
    to: recipientEmail,
    subject: `Payment Successful for ${projectName}`,
    body: emailBody,
  });
};
