import { marked } from "marked";
import nodemailer from "nodemailer";
import { env } from "~/env.mjs";

// Check if SMTP_HOST is defined and use a fake transport or the real SMTP transport accordingly
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      // @ts-expect-error nodemailer types are wrong
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: {
        user: env.SMTP_LOGIN,
        pass: env.SMTP_PASSWORD,
      },
    })
  : null;

export const sendEmail = async (options: { to: string; subject: string; body: string }) => {
  const bodyHtml = await marked.parseInline(options.body, { mangle: false });

  try {
    if (!transporter) {
      console.log("Sent email (fake):", options);
      return;
    }
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
