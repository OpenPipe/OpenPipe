import { env } from "~/env.mjs";
import { sendEmail } from "./sendEmail";
import { render } from "@react-email/render";
import ProjectInvitation from "./templates/ProjectInvitation";

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

  const emailBody = render(
    ProjectInvitation({
      projectName,
      invitationSenderName,
      invitationSenderEmail,
      invitationLink,
    }),
  );

  await sendEmail({
    to: recipientEmail,
    subject: "You've been invited to join a project",
    body: emailBody,
  });
};
