import { Column, Row, Section } from "@react-email/components";
import React, { CSSProperties } from "react";
import { Text } from ".";

interface Props {
  description?: Record<string, string>[];
  total: string;
  style?: CSSProperties;
}
export default function InvoiceDescription({ description, total, style }: Props) {
  return (
    <Section style={{ ...style, ...dark }}>
      {description &&
        description.map((item, index) => (
          <Row key={index}>
            <Column style={{ width: "100%" }}>
              <Text>{item.text}:</Text>
              {/* {item.description?.split("\n").map((i, key) => <Text key={key}>{i}</Text>)} */}
            </Column>
            <Column style={{ width: "100%" }}>
              <Text>{item.value}</Text>
            </Column>
          </Row>
        ))}

      <Row>
        <Column style={{ width: "100%" }}>
          <Text style={{ fontWeight: "bold" }}>Billing Total:</Text>
        </Column>
        <Column>
          <Text style={{ fontWeight: "bold" }}>${total}</Text>
        </Column>
      </Row>
    </Section>
  );
}

const dark = {
  padding: "24px",
  backgroundColor: "#f2f3f3",
  borderRadius: "4px",
};
