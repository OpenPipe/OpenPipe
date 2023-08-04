import { useState, useEffect } from "react";
import {
  Heading,
  VStack,
  Icon,
  HStack,
  Image,
  Text,
  Box,
  type BoxProps,
  type LinkProps,
  Link,
  Flex,
} from "@chakra-ui/react";
import Head from "next/head";
import { BsGithub, BsPersonCircle } from "react-icons/bs";
import { useRouter } from "next/router";
import { type IconType } from "react-icons";
import { RiDatabase2Line, RiFlaskLine } from "react-icons/ri";
import { signIn, useSession } from "next-auth/react";
import UserMenu from "./UserMenu";

type IconLinkProps = BoxProps & LinkProps & { label?: string; icon: IconType };

const IconLink = ({ icon, label, href, target, color, ...props }: IconLinkProps) => {
  const router = useRouter();
  const isActive = href && router.pathname.startsWith(href);
  return (
    <HStack
      w="full"
      p={4}
      color={color}
      as={Link}
      href={href}
      target={target}
      bgColor={isActive ? "gray.200" : "transparent"}
      _hover={{ bgColor: "gray.200", textDecoration: "none" }}
      justifyContent="start"
      cursor="pointer"
      {...props}
    >
      <Icon as={icon} boxSize={6} mr={2} />
      <Text fontWeight="bold" fontSize="sm">
        {label}
      </Text>
    </HStack>
  );
};

const Divider = () => <Box h="1px" bgColor="gray.200" />;

const NavSidebar = () => {
  const user = useSession().data;

  return (
    <VStack
      align="stretch"
      bgColor="gray.100"
      py={2}
      pb={0}
      height="100%"
      w={{ base: "56px", md: "200px" }}
      overflow="hidden"
    >
      <HStack as={Link} href="/" _hover={{ textDecoration: "none" }} spacing={0} px={4} py={2}>
        <Image src="/logo.svg" alt="" boxSize={6} mr={4} />
        <Heading size="md" fontFamily="inconsolata, monospace">
          OpenPipe
        </Heading>
      </HStack>
      <VStack spacing={0} align="flex-start" overflowY="auto" overflowX="hidden" flex={1}>
        {user != null && (
          <>
            <IconLink icon={RiFlaskLine} label="Experiments" href="/experiments" />
            <IconLink icon={RiDatabase2Line} label="Data" href="/data" />
          </>
        )}
        {user === null && (
          <IconLink
            icon={BsPersonCircle}
            label="Sign In"
            onClick={() => {
              signIn("github").catch(console.error);
            }}
          />
        )}
      </VStack>
      {user ? (
        <UserMenu user={user} borderColor={"gray.200"} borderTopWidth={1} borderBottomWidth={1} />
      ) : (
        <Divider />
      )}
      <VStack spacing={0} align="center">
        <Link
          href="https://github.com/openpipe/openpipe"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
          p={2}
        >
          <Icon as={BsGithub} boxSize={6} />
        </Link>
      </VStack>
    </VStack>
  );
};

export default function AppShell(props: { children: React.ReactNode; title?: string }) {
  const [vh, setVh] = useState("100vh"); // Default height to prevent flicker on initial render

  useEffect(() => {
    const setHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      setVh(`calc(var(--vh, 1vh) * 100)`);
    };
    setHeight(); // Set the height at the start

    window.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", setHeight);

    return () => {
      window.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
    };
  }, []);

  return (
    <Flex h={vh} w="100vw">
      <Head>
        <title>{props.title ? `${props.title} | OpenPipe` : "OpenPipe"}</title>
      </Head>
      <NavSidebar />
      <Box h="100%" flex={1} overflowY="auto">
        {props.children}
      </Box>
    </Flex>
  );
}
