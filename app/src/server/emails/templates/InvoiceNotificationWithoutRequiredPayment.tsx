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

const InvoiceNotificationWithoutRequiredPayment = ({
  projectName,
  amount,
  invoicesLink,
  projectLink,
  billingPeriod,
  description,
}: Props) => {
  const previewText = `OpenPipe Usage ${billingPeriod}`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>OpenPipe Usage {billingPeriod}</Header>

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
        Please visit your account to see more details and update a payment method. This will ensure
        we avoid any interruption of service!
      </Text>
      <Button href={invoicesLink}>Details</Button>
    </EmailLayout>
  );
};

InvoiceNotificationWithoutRequiredPayment.PreviewProps = {
  subject: "OpenPipe Usage Feb 2024. Payment Required",
  projectName: "My Project",
  amount: "0.00",
  invoicesLink: "#",
  projectLink: "#",
  billingPeriod: "Feb 2024",
  description: demoDescription,
} as Props;

export default InvoiceNotificationWithoutRequiredPayment;
