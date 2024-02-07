import * as React from "react";
import { Button, EmailLayout, Heading, InvoiceDescription, Text } from "./layout";
import { Link } from "@react-email/components";
import { demoDescription } from "./layout/DemoData";

interface Props {
  projectName: string;
  amount: string;
  paymentMethodsLink: string;
  invoicesLink: string;
  projectLink: string;
  billingPeriod: string;
  description?: Record<string, string>[];
}

const PaymentFailed = ({
  projectName,
  amount,
  paymentMethodsLink,
  invoicesLink,
  projectLink,
  billingPeriod,
  description,
}: Props) => {
  const previewText = `Add a payment method. OpenPipe Usage ${billingPeriod}.`;

  return (
    <EmailLayout previewText={previewText}>
      <Heading>Payment required</Heading>
      <Text>Avoid any interruption of service by adding a payment method.</Text>
      <Text style={{ fontSize: "1.5em" }}>OpenPipe Usage {billingPeriod} </Text>

      <Text>
        This is your monthly <Link href={invoicesLink}>invoice</Link> for OpenPipe Project{" "}
        <Link href={projectLink}>{projectName}</Link>.
      </Text>

      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />

      <Button href={paymentMethodsLink}>Add Payment Method</Button>
    </EmailLayout>
  );
};

PaymentFailed.PreviewProps = {
  subject: "OpenPipe Usage Feb 2024. Payment Required",
  projectName: "My Project",
  amount: "0.00",
  paymentMethodsLink: "#",
  invoicesLink: "#",
  projectLink: "#",
  billingPeriod: "Feb 2024",
  description: demoDescription,
} as Props;

export default PaymentFailed;
