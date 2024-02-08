import * as React from "react";
import { Button, EmailLayout, Header, Text } from "./layout";

interface Props {
  projectName: string;
  invitationSenderName: string;
  invitationSenderEmail: string;
  invitationLink: string;
}

const ProjectInvitation = ({
  projectName,
  invitationSenderName,
  invitationSenderEmail,
  invitationLink,
}: Props) => {
  return (
    <EmailLayout
      previewText={`You have been invited to join ${projectName} by ${invitationSenderName} (${invitationSenderEmail}).`}
    >
      <Header>You've been invited to join a project</Header>

      <Text>
        You have been invited to join <strong>{projectName}</strong> by {invitationSenderName} (
        {invitationSenderEmail}).
      </Text>

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
