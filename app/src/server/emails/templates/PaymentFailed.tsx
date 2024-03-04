import * as React from "react";
import { Button, EmailLayout, Header, InvoiceDescription, Text } from "./layout";
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
  const previewText = `Add a payment method. OpenPipe Invoice ${billingPeriod}.`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>Payment required</Header>
      <Text style={{ fontWeight: "bold" }}>OpenPipe Invoice {billingPeriod} </Text>

      <Text>
        We were unable to process the payment of your monthly{" "}
        <Link href={invoicesLink}>invoice</Link> for OpenPipe project{" "}
        <Link href={projectLink}>{projectName}</Link>:
      </Text>

      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />

      <Text>Keep your billing information up to date to avoid service interruptions.</Text>
      <Button href={paymentMethodsLink}>Update Payment Method</Button>
    </EmailLayout>
  );
};

PaymentFailed.PreviewProps = {
  subject: "OpenPipe Invoice Feb 2024. Payment Required",
  projectName: "My Project",
  amount: "0.00",
  paymentMethodsLink: "#",
  invoicesLink: "#",
  projectLink: "#",
  billingPeriod: "Feb 2024",
  description: demoDescription,
} as Props;

export default PaymentFailed;
