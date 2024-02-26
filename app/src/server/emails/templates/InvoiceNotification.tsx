import * as React from "react";
import { Button, EmailLayout, Header, InvoiceDescription, Text } from "./layout";
import { Link } from "@react-email/components";
import { demoDescription } from "./layout/DemoData";

interface Props {
  projectName: string;
  amount: string;
  invoicesLink: string;
  projectLink: string;
  billingPeriod: string;
  description?: Record<string, string>[];
}

const InvoiceNotification = ({
  projectName,
  amount,
  invoicesLink,
  projectLink,
  billingPeriod,
  description,
}: Props) => {
  const previewText = `OpenPipe Invoice ${billingPeriod}`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>{previewText}</Header>

      <Text>
        This is your monthly <Link href={invoicesLink}>invoice</Link> for OpenPipe project{" "}
        <Link href={projectLink}>{projectName}</Link>:
      </Text>

      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />
      <Text>
        Visit your account to see more details. Make sure your payment methods are up to date to
        avoid any interruptions in service.
      </Text>
      <Button href={invoicesLink}>{Number(amount) > 1 ? "Pay Now" : "Details"}</Button>
    </EmailLayout>
  );
};

InvoiceNotification.PreviewProps = {
  subject: "OpenPipe Invoice Feb 2024. Payment Required",
  projectName: "My Project",
  amount: "0.00",
  invoicesLink: "#",
  projectLink: "#",
  billingPeriod: "Feb 2024",
  description: demoDescription,
} as Props;

export default InvoiceNotification;
