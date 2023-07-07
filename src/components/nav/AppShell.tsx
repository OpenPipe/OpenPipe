import {
  Heading,
  VStack,
  Icon,
  HStack,
  Image,
  Grid,
  GridItem,
  Divider,
  Text,
  Box,
  type BoxProps,
  type LinkProps,
} from "@chakra-ui/react";
import Head from "next/head";
import { BsGithub, BsTwitter } from "react-icons/bs";
import { useRouter } from "next/router";
import PublicPlaygroundWarning from "../PublicPlaygroundWarning";
import { type IconType } from "react-icons";
import { RiFlaskLine } from "react-icons/ri";

type IconLinkProps = BoxProps & LinkProps & { label: string; icon: IconType; href: string };

const IconLink = ({ icon, label, href, target, ...props }: IconLinkProps) => {
  const isActive = useRouter().pathname.startsWith(href);
  return (
    <Box
      href={href}
      target={target}
      w="full"
      bgColor={isActive ? "gray.300" : "transparent"}
      _hover={{ bgColor: "gray.300" }}
      py={4}
      justifyContent="start"
      cursor="pointer"
      {...props}
    >
      <HStack w="full" px={4} color="gray.700">
        <Icon as={icon} boxSize={6} mr={2} />
        <Text fontWeight="bold">{label}</Text>
      </HStack>
    </Box>
  );
};

const NavSidebar = () => {
  return (
    <VStack align="stretch" bgColor="gray.100" py={2} pb={0} height="100%">
      <HStack spacing={0}>
        <Image src="/logo.svg" alt="" w={6} h={6} />
        <Heading size="md" p={2}>
          QueryKey
        </Heading>
      </HStack>
      <Divider />
      <VStack spacing={0} align="flex-start" overflowY="auto" flex={1}>
        <IconLink icon={RiFlaskLine} label="Experiments" href="/experiments" />
      </VStack>

      <Divider />
      <VStack align="center" spacing={4} p={2}>
        <IconLink
          icon={BsGithub}
          label="GitHub"
          href="https://github.com/corbt/querykey"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
        />
        <IconLink
          icon={BsTwitter}
          label="Twitter"
          href="https://twitter.com/corbtt"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
        />
      </VStack>
    </VStack>
  );
};

export default function AppShell(props: { children: React.ReactNode; title?: string }) {
  return (
    <Grid
      h="100vh"
      w="100vw"
      templateColumns="220px minmax(0, 1fr)"
      templateRows="max-content 1fr"
      templateAreas={'"warning warning"\n"sidebar main"'}
    >
      <Head>
        <title>{props.title ? `${props.title} | QueryKey` : "QueryKey"}</title>
      </Head>
      <GridItem area="warning">
        <PublicPlaygroundWarning />
      </GridItem>
      <GridItem area="sidebar" overflow="auto">
        <NavSidebar />
      </GridItem>
      <GridItem area="main" overflowY="auto">
        {props.children}
      </GridItem>
    </Grid>
  );
}
