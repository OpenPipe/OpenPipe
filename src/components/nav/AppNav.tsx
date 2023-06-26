import { Box, Flex } from "@chakra-ui/react";
import Head from "next/head";

export default function AppNav(props: { children: React.ReactNode; title?: string }) {
  return (
    <Flex minH="100vh">
      <Head>
        <title>{props.title ? `${props.title} | Prompt Lab` : "Prompt Lab"}</title>
      </Head>
      {/* Placeholder for now */}
      <Box bgColor="gray.100" flexShrink={0} width="200px">
        Nav Sidebar
      </Box>
      <Box flex={1} overflowX="auto" overflowY="auto" h="100vh">
        {props.children}
      </Box>
    </Flex>
  );
}
