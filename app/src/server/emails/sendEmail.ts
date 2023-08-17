import { marked } from "marked";
import nodemailer from "nodemailer";
import { env } from "~/env.mjs";

const transporter = nodemailer.createTransport({
  // All the SMTP_ env vars come from https://app.brevo.com/settings/keys/smtp
  // @ts-expect-error nodemailer types are wrong
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_LOGIN,
    pass: env.SMTP_PASSWORD,
  },
});

export const sendEmail = async (options: { to: string; subject: string; body: string }) => {
  const bodyHtml = await marked.parseInline(options.body, { mangle: false });

  try {
    await transporter.sendMail({
      from: env.SENDER_EMAIL,
      to: options.to,
      subject: options.subject,
      html: bodyHtml,
      text: options.body,
    });
  } catch (error) {
    console.error("error sending email", error);
    throw error;
  }
};
