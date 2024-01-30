import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";

export const sendPaymentFailed = async (
  amount: number,
  projectName: string,
  projectSlug: string,
  recipientEmail: string,
) => {
  const paymentMethodsLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}/billing/payment-methods`;

  const emailBody = `
  <p>We attempted to charge your default payment method for project "${projectName}" but the payment of $${amount.toFixed(
    2,
  )} failed.</p>
  <p>Please review and update your payment information by clicking <a href="${paymentMethodsLink}">here</a>.</p>
`;

  await sendEmail({
    to: recipientEmail,
    subject: `Payment Failed for ${projectName}`,
    body: emailBody,
  });
};
