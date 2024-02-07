import { Button as ReactEmailButton } from "@react-email/components";
import React, { CSSProperties, ReactNode } from "react";

interface Props {
  style?: CSSProperties;
  href?: string;
  children: ReactNode;
}
export default function Button({ style, href, children }: Props) {
  return (
    <ReactEmailButton style={{ ...button, ...style }} href={href}>
      {children}
    </ReactEmailButton>
  );
}

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
};

const button = {
  backgroundColor: "#ff5733",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "18px",
  paddingTop: "19px",
  paddingBottom: "19px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
};
