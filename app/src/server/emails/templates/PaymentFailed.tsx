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
  const previewText = `Add a payment method. OpenPipe Usage ${billingPeriod}.`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>Payment required</Header>
      <Text style={{ fontSize: "1.5em" }}>OpenPipe Usage {billingPeriod} </Text>

      <Text>
        We were unable to process the payment for your invoice. Please update your payment
        information.
      </Text>
      <Text>
        Your monthly <Link href={invoicesLink}>invoice</Link> for OpenPipe project{" "}
        <Link href={projectLink}>{projectName}</Link>:
      </Text>

      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />

      <Text>Avoid service interruptions by updating your payment method.</Text>
      <Button href={paymentMethodsLink}>Update Payment Method</Button>
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
