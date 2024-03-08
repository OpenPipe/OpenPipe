import React, { type ReactNode } from "react";
import { Html, Head, Body, Preview, Container, Section, Row } from "@react-email/components";
import { Footer, Logo } from ".";

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
}

export default function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Section style={{ paddingTop: "40px", paddingBottom: "40px" }}>
            <Row>{children}</Row>
            <Footer />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
  maxWidth: "100%",
};
