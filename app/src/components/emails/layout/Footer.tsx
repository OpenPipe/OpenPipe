import { Row, Section } from "@react-email/components";
import React from "react";

export default function Header() {
  return (
    <Section>
      <Row>
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
