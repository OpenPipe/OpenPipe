import * as React from "react";
import { Button, EmailLayout, Heading, InvoiceDescription, Text } from "./layout";
import { Link } from "@react-email/components";

interface Props {
  subject: string;
  projectName: string;
  amount: string;
  billingPeriod?: string;
  projectLink: string;
  invoicesLink: string;
  invoiceLink: string;
  description?: Record<string, string>[];
}

const PaymentSuccessful = ({
  subject,
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
      <Heading>{subject}</Heading>
      <Text style={{ fontSize: "1.5em" }}>OpenPipe Usage {billingPeriod} </Text>

      <Text>
        Your <Link href={invoiceLink}>invoice</Link> of ${amount} for project{" "}
        <Link href={projectLink}>{projectName}</Link> has been successfully paid!
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
  subject: "Payment Successful for My Project",
  projectName: "My Project",
  amount: "0.00",
  billingPeriod: "Feb 2024",
  projectLink: "#projectLink",
  invoicesLink: "#invoicesLink",
  invoiceLink: "#invoiceLink",
  description: [
    {
      text: "Total inference spend",
      value: "$64.50",
      description:
        "Tokens: 2,958,490 ($0.0000218/token) \n \n      Input tokens: 1,470,393 \n\n      Output tokens: 1,488,097",
    },
    { text: "Total training spend", value: "$9.63", description: "Training tokens: 475,029" },
  ],
} as Props;

export default PaymentSuccessful;
