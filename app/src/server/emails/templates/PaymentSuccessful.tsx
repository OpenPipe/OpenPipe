import * as React from "react";
import { Button, EmailLayout, Header, InvoiceDescription, Text } from "./layout";
import { Link } from "@react-email/components";
import { demoDescription } from "./layout/DemoData";

interface Props {
  projectName: string;
  amount: string;
  billingPeriod: string;
  projectLink: string;
  invoicesLink: string;
  invoiceLink: string;
  description?: Record<string, string>[];
}

const PaymentSuccessful = ({
  projectName,
  amount,
  billingPeriod,
  projectLink,
  invoicesLink,
  invoiceLink,
  description,
}: Props) => {
  const previewText = `Your invoice of $${amount} for project ${projectName} has been successfully paid!`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>Payment Successful for {projectName}</Header>
      <Text style={{ fontWeight: "bold" }}>OpenPipe Invoice {billingPeriod} </Text>

      <Text>
        Your <Link href={invoiceLink}>invoice</Link> of ${amount} for project{" "}
        <Link href={projectLink}>{projectName}</Link> has been successfully paid:
      </Text>
      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />

      <Text>Visit payment history for more details.</Text>

      <Button href={invoicesLink}>Payment History</Button>
    </EmailLayout>
  );
};

PaymentSuccessful.PreviewProps = {
  projectName: "My Project",
  amount: "0.00",
  billingPeriod: "Feb 2024",
  projectLink: "#projectLink",
  invoicesLink: "#invoicesLink",
  invoiceLink: "#invoiceLink",
  description: demoDescription,
} as Props;

export default PaymentSuccessful;
