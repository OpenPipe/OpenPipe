import * as React from "react";
import { Button, EmailLayout, Header, InvoiceDescription, Text } from "./layout";
import { Link } from "@react-email/components";
import { demoDescription } from "./layout/DemoData";

interface Props {
  projectName: string;
  amount: string;
  projectLink: string;
  billingPeriod: string;
  description?: Record<string, string>[];
  invoiceId: string;
}

const InvoiceNotification = ({
  projectName,
  amount,
  projectLink,
  billingPeriod,
  description,
  invoiceId,
}: Props) => {
  const previewText = `OpenPipe Invoice ${billingPeriod}`;
  const invoicesLink = `${projectLink}/billing/invoices/${invoiceId}`;
  const usageLink = `${projectLink}/usage`;
  const paymentMethodsLink = `${projectLink}/billing/payment-methods`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>{previewText}</Header>

      <Text>
        This invoice covers your OpenPipe usage for <b>{billingPeriod}</b> for project{" "}
        <Link href={projectLink}>{projectName}</Link>.
      </Text>

      <InvoiceDescription
        style={{ marginBottom: "20px" }}
        description={description}
        total={amount}
      />
      <Text>
        Visit your <Link href={usageLink}>usage page</Link> to see more details on a model-by-model
        basis. Make sure your <Link href={paymentMethodsLink}>payment methods</Link> are up to date
        to avoid any interruptions in service.
      </Text>
      <Button href={invoicesLink}>{Number(amount) > 1 ? "Pay Now" : "Invoice Details"}</Button>
    </EmailLayout>
  );
};

InvoiceNotification.PreviewProps = {
  subject: "OpenPipe Invoice Feb 2024. Payment Required",
  projectName: "My Project",
  amount: "0.00",
  projectLink: "http://localhost:3000/p/my-project",
  invoiceId: "123",
  billingPeriod: "Feb 2024",
  description: demoDescription,
} as Props;

export default InvoiceNotification;
