import { Text } from "@react-email/components";
import React, { type CSSProperties, type ReactNode } from "react";

interface Props {
  style?: CSSProperties;
  children: ReactNode;
}
export default function Header({ children, style }: Props) {
  return <Text style={{ ...heading, ...style }}>{children}</Text>;
}

const heading = {
  fontSize: "25px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
};
