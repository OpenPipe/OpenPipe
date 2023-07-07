import {
  Box,
  Heading,
  VStack,
  Icon,
  HStack,
  type BoxProps,
  forwardRef,
  Image,
  Link,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import Head from "next/head";
import { api } from "~/utils/api";
import { BsGithub, BsPlusSquare, BsTwitter } from "react-icons/bs";
import { RiFlaskLine } from "react-icons/ri";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { useHandledAsyncCallback } from "~/utils/hooks";
import PublicPlaygroundWarning from "../PublicPlaygroundWarning";

const ExperimentLink = forwardRef<BoxProps & { active: boolean | undefined }, "a">(
  ({ children, active, ...props }, ref) => (
    <Box
      ref={ref}
      bgColor={active ? "gray.300" : "transparent"}
      _hover={{ bgColor: "gray.300" }}
      borderRadius={4}
      px={4}
      py={2}
      justifyContent="start"
      cursor="pointer"
      {...props}
    >
      {children}
    </Box>
  )
);

ExperimentLink.displayName = "ExperimentLink";

const Separator = () => <Box h="1px" bgColor="gray.300" />;

const NavSidebar = () => {
  const experiments = api.experiments.list.useQuery();
  const router = useRouter();
  const utils = api.useContext();
  const currentId = router.query.id as string | undefined;

  const createMutation = api.experiments.create.useMutation();
  const [createExperiment] = useHandledAsyncCallback(async () => {
    const newExperiment = await createMutation.mutateAsync({ label: "New Experiment" });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments/[id]", query: { id: newExperiment.id } });
  }, [createMutation, router]);

  return (
    <VStack align="stretch" bgColor="gray.100" p={2} pb={0} height="100%">
      <HStack spacing={0}>
        <Image src="/logo.svg" alt="" w={6} h={6} />
        <Heading size="md" p={2}>
          OpenPipe
        </Heading>
      </HStack>
      <Separator />
      <VStack spacing={0} align="flex-start" overflowY="auto" flex={1}>
        <Heading size="xs" textAlign="center" p={2}>
          Experiments
        </Heading>
        <VStack spacing={1} align="stretch" flex={1}>
          <ExperimentLink
            onClick={createExperiment}
            active={false}
            display="flex"
            alignItems="center"
          >
            <Icon as={BsPlusSquare} boxSize={4} mr={2} />
            New Experiment
          </ExperimentLink>

          {experiments?.data?.map((exp) => (
            <ExperimentLink
              key={exp.id}
              as={NextLink}
              active={exp.id === currentId}
              href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}
              display="flex"
              alignItems="center"
            >
              <Icon as={RiFlaskLine} boxSize={4} mr={2} />
              {exp.label}
            </ExperimentLink>
          ))}
        </VStack>
      </VStack>

      <Separator />
      <HStack align="center" justify="center" spacing={4} p={2}>
        <Link
          href="https://github.com/corbt/openpipe"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
        >
          <Icon as={BsGithub} boxSize={8} />
        </Link>
        <Link
          href="https://twitter.com/corbtt"
          target="_blank"
          color="gray.500"
          _hover={{ color: "gray.800" }}
        >
          <Icon as={BsTwitter} boxSize={8} />
        </Link>
      </HStack>
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
        <title>{props.title ? `${props.title} | OpenPipe` : "OpenPipe"}</title>
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
