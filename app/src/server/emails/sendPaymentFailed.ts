import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";

export const sendPaymentFailed = async ({
  recipientEmail,
  projectName,
  projectSlug,
}: {
  recipientEmail: string;
  projectName: string;
  projectSlug: string;
}) => {
  const paymentMethodsLink = `${env.NEXT_PUBLIC_HOST}/p/${projectSlug}/billing/payment-methods`;

  const emailBody = `
  <p>The payment for ${projectName} has failed. This could be due to an issue with your payment method or other transaction-related problems.</p>
  <p>You can review and update your payment information by clicking <a href="${paymentMethodsLink}">here</a>.</p>
`;

  await sendEmail({
    to: recipientEmail,
    subject: `Payment Failed for ${projectName}`,
    body: emailBody,
  });
};
