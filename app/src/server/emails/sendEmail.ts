import * as SibApiV3Sdk from "@sendinblue/client";

import { env } from "~/env.mjs";

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);

export const sendEmail = async ({
  email,
  subject,
  htmlContent,
}: {
  email: string;
  subject: string;
  htmlContent: string;
}) => {
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    sender: { name: "OpenPipe", email: env.BREVO_EMAIL },
    to: [{ email }],
    subject,
    htmlContent,
  };

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (err) {
    console.log("Error sending email", sendSmtpEmail);
    console.error(err);
    throw err;
  }
};
