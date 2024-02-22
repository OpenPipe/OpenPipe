import { Row, Section, Text } from "@react-email/components";
import React from "react";

export default function Footer() {
  return (
    <Section style={{ minWidth: "100%" }}>
      <Row style={{ minWidth: "100%" }}>
        <Text style={footer}>
          Sincerely, <br />
          The OpenPipe Team
        </Text>
        <span style={footer}>© {new Date().getFullYear()} OpenPipe, Inc.</span>
      </Row>
    </Section>
  );
}

const footer = {
  color: "#9ca299",
  fontSize: "14px",
  marginBottom: "10px",
};
