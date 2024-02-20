import { Column, Row } from "@react-email/components";
import React, { CSSProperties } from "react";
import { Text } from ".";
import Headlight from "./Highlight";

interface Props {
  description?: Record<string, string>[];
  total: string;
  style?: CSSProperties;
}
export default function InvoiceDescription({ description, total, style }: Props) {
  return (
    <Headlight style={{ ...style }}>
      {description &&
        description.map((item, index) => (
          <Row key={index}>
            <Column style={{ width: "100%" }}>
              <Text>{item.text}:</Text>
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
    </Headlight>
  );
}
