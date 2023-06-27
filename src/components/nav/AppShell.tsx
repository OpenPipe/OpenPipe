import {
  Box,
  Flex,
  Stack,
  Button,
  Heading,
  VStack,
  Icon,
  HStack,
  BoxProps,
  forwardRef,
  Divider,
  Image,
} from "@chakra-ui/react";
import Head from "next/head";
import { api } from "~/utils/api";
import { BsPlusSquare } from "react-icons/bs";
import { RiFlaskLine } from "react-icons/ri";
import { useRouter } from "next/router";
import Link from "next/link";
import { useHandledAsyncCallback } from "~/utils/hooks";

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

export default function AppShell(props: { children: React.ReactNode; title?: string }) {
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
    <Flex minH="100vh">
      <Head>
        <title>{props.title ? `${props.title} | Prompt Lab` : "Prompt Lab"}</title>
      </Head>
      <Box bgColor="gray.100" flexShrink={0} width="220px" p={2}>
        <VStack align="stretch">
          <HStack spacing={0}>
            <Image
              src="/flask2.svg"
              alt=""
              w={6}
              h={6}
              // filter="drop-shadow(0 0 2px rgb(0 0 0 / 0.4))"
            />
            <Heading size="md" p={2}>
              Prompt Lab
            </Heading>
          </HStack>
          <Box h="1px" bgColor="gray.400" />
          <HStack align="center" spacing={2} p={2}>
            <Heading size="xs" textAlign="center">
              Experiments
            </Heading>
          </HStack>
          <VStack spacing={1} align="stretch">
            {experiments?.data?.map((exp) => (
              <ExperimentLink
                key={exp.id}
                as={Link}
                active={exp.id === currentId}
                href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}
              >
                <Icon as={RiFlaskLine} boxSize={4} mr={2} />

                {exp.label}
              </ExperimentLink>
            ))}
            <ExperimentLink
              onClick={createExperiment}
              active={false}
              display="flex"
              alignItems="center"
            >
              <Icon as={BsPlusSquare} boxSize={4} mr={2} />
              New Experiment
            </ExperimentLink>
          </VStack>
        </VStack>
      </Box>
      <Box flex={1} overflowX="auto" overflowY="auto" h="100vh">
        {props.children}
      </Box>
    </Flex>
  );
}
