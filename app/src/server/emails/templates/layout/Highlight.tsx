import { Section } from "@react-email/components";
import React, { type CSSProperties, type ReactNode } from "react";

interface Props {
  style?: CSSProperties;
  children: ReactNode;
}
export default function Highlight({ style, children }: Props) {
  return <Section style={{ ...style, ...dark }}>{children}</Section>;
}

const dark = {
  padding: "24px",
  backgroundColor: "#f2f3f3",
  borderRadius: "4px",
  minWidth: "100%",
};
