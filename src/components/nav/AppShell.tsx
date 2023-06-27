import { Box, Flex, Stack, Button, Heading, VStack, Icon, HStack } from "@chakra-ui/react";
import Head from "next/head";
import { api } from "~/utils/api";
import { BsPlusSquare } from "react-icons/bs";
import { RiFlaskLine } from "react-icons/ri";
import { useRouter } from "next/router";
import Link from "next/link";
import { useHandledAsyncCallback } from "~/utils/hooks";

const NavButton = ({ label, onClick }) => {
  return (
    <Button
      variant="ghost"
      justifyContent="start"
      onClick={onClick}
      w="full"
      leftIcon={<BsPlusSquare />}
    >
      {label}
    </Button>
  );
};

export default function AppShell(props: { children: React.ReactNode; title?: string }) {
  const experiments = api.experiments.list.useQuery();
  const router = useRouter();
  const utils = api.useContext();

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
      <Box bgColor="gray.100" flexShrink={0} width="220px" p={8}>
        <VStack align="start" spacing={4}>
          <HStack align="center" spacing={2}>
            <Icon as={RiFlaskLine} boxSize={6} />
            <Heading size="sm" textAlign="center">
              Experiments
            </Heading>
          </HStack>
          {experiments?.data?.map((exp) => (
            <Box
              key={exp.id}
              as={Link}
              href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}
              justifyContent="start"
            >
              {exp.label}
            </Box>
          ))}
          <NavButton label="New Experiment" onClick={createExperiment} />
        </VStack>
      </Box>
      <Box flex={1} overflowX="auto" overflowY="auto" h="100vh">
        {props.children}
      </Box>
    </Flex>
  );
}
