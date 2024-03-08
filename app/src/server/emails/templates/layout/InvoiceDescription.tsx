import { Column, Row } from "@react-email/components";
import React, { type CSSProperties } from "react";
import { Highlight, Text } from ".";

interface Props {
  description?: Record<string, string>[];
  total: string;
  style?: CSSProperties;
}
export default function InvoiceDescription({ description, total, style }: Props) {
  return (
    <Highlight style={{ ...style }}>
      {description &&
        description.map((item, index) => (
          <Row key={index} style={{ minWidth: "100%" }}>
            <Column>
              <Text>{item.text}:</Text>
            </Column>
            <Column align="right">
              <Text>{item.value}</Text>
            </Column>
          </Row>
        ))}
      <Row style={{ minWidth: "100%" }}>
        <Column>
          <Text style={{ fontWeight: "bold" }}>Billing Total: </Text>
        </Column>
        <Column align="right">
          <Text style={{ fontWeight: "bold" }}> ${total}</Text>
        </Column>
      </Row>
    </Highlight>
  );
}
