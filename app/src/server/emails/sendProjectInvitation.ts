import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";

export const sendProjectInvitation = async ({
  invitationToken,
  recipientEmail,
  invitationSenderName,
  invitationSenderEmail,
  projectName,
}: {
  invitationToken: string;
  recipientEmail: string;
  invitationSenderName: string;
  invitationSenderEmail: string;
  projectName: string;
}) => {
  const invitationLink = `${env.NEXT_PUBLIC_HOST}/invitations/${invitationToken}`;

  const emailBody = `
    <p>You have been invited to join ${projectName} by ${invitationSenderName} (${invitationSenderEmail}).</p>
    <p>Click <a href="${invitationLink}">here</a> to accept the invitation.</p>
    `;

  await sendEmail({
    to: recipientEmail,
    subject: "You've been invited to join a project",
    body: emailBody,
  });
};
