import { useState, useEffect } from "react";
import {
  VStack,
  Icon,
  HStack,
  Image,
  Text,
  Box,
  Link as ChakraLink,
  Flex,
  Tooltip,
  type BoxProps,
  IconButton,
} from "@chakra-ui/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsFillKeyFill, BsGear, BsGithub, BsPersonCircle, BsClipboard2Data } from "react-icons/bs";
import { IoStatsChartOutline, IoSpeedometerOutline } from "react-icons/io5";
import { AiOutlineThunderbolt, AiOutlineDatabase } from "react-icons/ai";
import { FaBalanceScale, FaReadme } from "react-icons/fa";
import { FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { signIn, useSession } from "next-auth/react";

import ProjectMenu from "./ProjectMenu";
import NavSidebarOption from "./NavSidebarOption";
import IconLink from "./IconLink";
import { BetaModal } from "../BetaModal";
import { useIsMissingBetaAccess, useSelectedProject } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import { useAccessCheck } from "../ConditionallyEnable";
import { env } from "~/env.mjs";
import MaintenanceBanner from "../MaintenanceBanner";

const Divider = (props: BoxProps) => <Box h="1px" bgColor="gray.300" w="full" {...props} />;

const NavSidebar = () => {
  const user = useSession().data;
  const project = useSelectedProject().data;

  const sidebarExpanded = useAppStore((state) => state.sidebarExpanded);
  const setSidebarExpanded = useAppStore((state) => state.setSidebarExpanded);

  const isAdmin = useAccessCheck("requireIsAdmin").access;

  return (
    <VStack
      align="stretch"
      py={2}
      pb={0}
      height="100%"
      px={{ base: 2, md: sidebarExpanded ? 3 : 2 }}
      w={{ base: "56px", md: sidebarExpanded ? "220px" : "56px" }}
      transition="width 0.2s ease-in-out; padding 0.2s ease-in-out;"
      overflow="hidden"
      borderRightWidth={1}
      borderColor="gray.300"
    >
      <HStack
        as={Link}
        href="/"
        _hover={{ textDecoration: "none" }}
        spacing={{ base: 1, md: 0 }}
        mx={2}
        py={{ base: 1, md: 2 }}
        display={{ md: "none" }}
      >
        <Image src="/logo.svg" alt="" boxSize={6} mr={4} ml={0.5} />
      </HStack>
      <Divider display={{ md: "none" }} />

      <VStack align="flex-start" overflowY="auto" overflowX="hidden" flex={1}>
        {user != null && (
          <>
            <ProjectMenu displayProjectName={sidebarExpanded} />
            <Divider />
            <IconLink icon={IoStatsChartOutline} label="Request Logs" href="/request-logs" />
            <IconLink icon={AiOutlineDatabase} label="Datasets" href="/datasets" />
            <IconLink icon={AiOutlineThunderbolt} label="Fine Tunes" href="/fine-tunes" />
            <IconLink icon={FaBalanceScale} label="Evals" href="/evals" />
            {isAdmin && <IconLink icon={BsClipboard2Data} label="Monitors" href="/monitors" />}
            <VStack w="full" alignItems="flex-start" spacing={1} pt={8}>
              <Text
                pl={2}
                pb={2}
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                h={6}
                display={{ base: "none", md: "flex" }}
              >
                {sidebarExpanded ? "CONFIGURATION" : ""}
              </Text>
              <IconLink icon={BsGear} label="Project Settings" href="/settings" />
              <IconLink icon={IoSpeedometerOutline} label="Usage" href="/usage" />
              {project?.billable && (
                <IconLink icon={LiaFileInvoiceDollarSolid} label="Billing" href="/billing" />
              )}
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                aria-label="Toggle sidebar expanded"
                icon={
                  <Icon
                    as={sidebarExpanded ? FiChevronsLeft : FiChevronsRight}
                    boxSize={6}
                    strokeWidth={1.5}
                    color="gray.600"
                  />
                }
                boxSize={8}
                ml={0.5}
                display={{ base: "none", md: "flex" }}
              />
            </VStack>
          </>
        )}
        {user === null && (
          <NavSidebarOption>
            <HStack
              w="full"
              p={{ base: 2, md: 4 }}
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
      <Flex
        flexDir={{ base: "column-reverse", md: sidebarExpanded ? "row" : "column-reverse" }}
        align="center"
        justify="center"
      >
        {isAdmin && (
          <Link
            href={{
              pathname: `/admin`,
            }}
          >
            <Icon color="gray.500" as={BsFillKeyFill} boxSize={8} mr={2} />
          </Link>
        )}
        <ChakraLink
          href="https://github.com/openpipe/openpipe"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
          p={2}
        >
          <Icon as={BsGithub} boxSize={6} />
        </ChakraLink>
        <Tooltip label="View Docs">
          <ChakraLink
            href="https://docs.openpipe.ai"
            target="_blank"
            color="gray.500"
            _hover={{ color: "gray.800" }}
            p={2}
            mt={1}
          >
            <Icon as={FaReadme} boxSize={6} />
          </ChakraLink>
        </Tooltip>
      </Flex>
    </VStack>
  );
};

export default function AppShell({
  children,
  title,
  requireAuth,
  requireBeta,
  containerProps,
}: {
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
  requireBeta?: boolean;
  containerProps?: BoxProps;
}) {
  const [vh, setVh] = useState("100vh"); // Default height to prevent flicker on initial render
  const router = useRouter();

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

  const isMissingBetaAccess = useIsMissingBetaAccess();

  return (
    <>
      <Flex h={vh} w="100vw">
        <Head>
          <title>{title ? `${title} | OpenPipe` : "OpenPipe"}</title>
        </Head>

        <NavSidebar />
        <Box
          position="relative"
          h="100%"
          flex={1}
          overflowY="auto"
          bgColor="gray.50"
          {...containerProps}
        >
          {env.NEXT_PUBLIC_MAINTENANCE_MODE && <MaintenanceBanner />}

          {children}
        </Box>
      </Flex>
      <BetaModal isOpen={!!requireBeta && isMissingBetaAccess} onClose={router.back} />
    </>
  );
}
