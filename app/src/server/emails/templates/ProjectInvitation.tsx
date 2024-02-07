import * as React from "react";
import { Button, EmailLayout, Heading, Text } from "./layout";

interface Props {
  subject: string;
  projectName: string;
  invitationSenderName: string;
  invitationSenderEmail: string;
  invitationLink: string;
}

const ProjectInvitation = ({
  subject,
  projectName,
  invitationSenderName,
  invitationSenderEmail,
  invitationLink,
}: Props) => {
  const previewText = `You have been invited to join ${projectName} by ${invitationSenderName} (${invitationSenderEmail}).`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading>{subject}</Heading>

      <Text>{previewText}</Text>

      <Button href={invitationLink}>Accept invitation</Button>
    </EmailLayout>
  );
};

ProjectInvitation.PreviewProps = {
  subject: "You've been invited to join a project",
  projectName: "My Project",
  invitationSenderName: "UserName",
  invitationSenderEmail: "user@example.com",
  invitationLink: "#",
} as Props;

export default ProjectInvitation;
