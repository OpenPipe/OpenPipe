import { Text as ReactEmailText } from "@react-email/components";
import React, { type CSSProperties, type ReactNode } from "react";

interface Props {
  style?: CSSProperties;
  children: ReactNode;
}
export default function Text({ style, children }: Props) {
  return <ReactEmailText style={{ ...text, ...style }}>{children}</ReactEmailText>;
}

const text = {
  fontSize: "18px",
  lineHeight: "1.4",
  color: "#484848",
};
