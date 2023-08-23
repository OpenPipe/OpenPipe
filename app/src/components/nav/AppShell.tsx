import { useState, useEffect, useRef } from "react";
import {
  Heading,
  VStack,
  Icon,
  HStack,
  Image,
  Text,
  Box,
  Link as ChakraLink,
  Flex,
  useBreakpointValue,
} from "@chakra-ui/react";
import Head from "next/head";
import Link from "next/link";
import { BsGearFill, BsGithub, BsPersonCircle } from "react-icons/bs";
import { IoStatsChartOutline } from "react-icons/io5";
import { RiHome3Line, RiFlaskLine } from "react-icons/ri";
import { FaRobot } from "react-icons/fa";
import { signIn, useSession } from "next-auth/react";
import { env } from "~/env.mjs";
import ProjectMenu from "./ProjectMenu";
import NavSidebarOption from "./NavSidebarOption";
import IconLink from "./IconLink";

const Divider = () => <Box h="1px" bgColor="gray.300" w="full" />;

const NavSidebar = () => {
  const user = useSession().data;

  // Hack to get around initial flash, see https://github.com/chakra-ui/chakra-ui/issues/6452
  const isMobile = useBreakpointValue({ base: true, md: false, ssr: false });
  const renderCount = useRef(0);
  renderCount.current++;

  const displayLogo = isMobile && renderCount.current > 1;

  return (
    <VStack
      align="stretch"
      py={2}
      px={2}
      pb={0}
      height="100%"
      w={{ base: "56px", md: "240px" }}
      overflow="hidden"
      borderRightWidth={1}
      borderColor="gray.300"
    >
      {displayLogo && (
        <>
          <HStack
            as={Link}
            href="/"
            _hover={{ textDecoration: "none" }}
            spacing={{ base: 1, md: 0 }}
            mx={2}
            py={{ base: 1, md: 2 }}
          >
            <Image src="/logo.svg" alt="" boxSize={6} mr={4} ml={{ base: 0.5, md: 0 }} />
            <Heading size="md" fontFamily="inconsolata, monospace">
              OpenPipe
            </Heading>
          </HStack>
          <Divider />
        </>
      )}

      <VStack align="flex-start" overflowY="auto" overflowX="hidden" flex={1}>
        {user != null && (
          <>
            <ProjectMenu />
            <Divider />

            {env.NEXT_PUBLIC_FF_SHOW_LOGGED_CALLS && (
              <>
                <IconLink icon={RiHome3Line} label="Dashboard" href="/dashboard" beta />
                <IconLink
                  icon={IoStatsChartOutline}
                  label="Request Logs"
                  href="/request-logs"
                  beta
                />
                <IconLink icon={FaRobot} label="Fine Tunes" href="/fine-tunes" beta />
              </>
            )}
            <IconLink icon={RiFlaskLine} label="Experiments" href="/experiments" />
            <VStack w="full" alignItems="flex-start" spacing={0} pt={8}>
              <Text
                pl={2}
                pb={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                display={{ base: "none", md: "flex" }}
              >
                CONFIGURATION
              </Text>
              <IconLink icon={BsGearFill} label="Project Settings" href="/project/settings" />
            </VStack>
          </>
        )}
        {user === null && (
          <NavSidebarOption>
            <HStack
              w="full"
              p={4}
              as={ChakraLink}
              justifyContent="start"
              onClick={() => {
                signIn("github").catch(console.error);
              }}
            >
              <Icon as={BsPersonCircle} boxSize={6} mr={2} />
              <Text fontWeight="bold" fontSize="sm">
                Sign In
              </Text>
            </HStack>
          </NavSidebarOption>
        )}
      </VStack>

      <Divider />
      <VStack spacing={0} align="center">
        <ChakraLink
          href="https://github.com/openpipe/openpipe"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
          p={2}
        >
          <Icon as={BsGithub} boxSize={6} />
        </ChakraLink>
      </VStack>
    </VStack>
  );
};

export default function AppShell({
  children,
  title,
  requireAuth,
}: {
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
}) {
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

  const user = useSession().data;
  const authLoading = useSession().status === "loading";

  useEffect(() => {
    if (requireAuth && user === null && !authLoading) {
      signIn("github").catch(console.error);
    }
  }, [requireAuth, user, authLoading]);

  return (
    <Flex h={vh} w="100vw">
      <Head>
        <title>{title ? `${title} | OpenPipe` : "OpenPipe"}</title>
      </Head>
      <NavSidebar />
      <Box h="100%" flex={1} overflowY="auto" bgColor="gray.50">
        {children}
      </Box>
    </Flex>
  );
}
