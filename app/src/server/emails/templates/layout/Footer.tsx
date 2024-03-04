import { Row, Section, Text, Link } from "@react-email/components";
import React from "react";

export default function Footer() {
  return (
    <Section style={{ minWidth: "100%" }}>
      <Row style={{ minWidth: "100%" }}>
        <Text style={footer}>
          Sincerely, The OpenPipe Team. Questions or issues? Contact us at{" "}
          <Link href="mailto:support@openpipe.ai" style={footerLink}>
            support@openpipe.ai
          </Link>
          .
        </Text>
        <Text style={footer}>© {new Date().getFullYear()} OpenPipe, Inc.</Text>
      </Row>
    </Section>
  );
}

const footer = {
  color: "#9ca299",
  fontSize: "14px",
  marginBottom: "10px",
};

const footerLink = {
  ...footer,
  textDecoration: "underline",
};
