import { Box, Flex } from "@chakra-ui/react";
import Head from "next/head";

export default function AppNav(props: { children: React.ReactNode; title?: string }) {
  return (
    <Flex minH="100vh" align="stretch">
      <Head>
        <title>{props.title ? `${props.title} | Prompt Bench` : "Prompt Bench"}</title>
      </Head>
      {/* Placeholder for now */}
      <Box bgColor="gray.100" height="100vh" width="200px" />
      <Box flex={1}>{props.children}</Box>
    </Flex>
  );
}
