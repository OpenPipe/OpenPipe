import {
  SimpleGrid,
  Icon,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  Center,
  Text,
  Link,
  HStack,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { ExperimentCard, NewExperimentCard } from "~/components/experiments/ExperimentCard";
import { signIn, useSession } from "next-auth/react";

export default function ExperimentsPage() {
  const experiments = api.experiments.list.useQuery();

  const user = useSession().data;
  const authLoading = useSession().status === "loading";

  if (user === null || authLoading) {
    return (
      <AppShell title="Experiments">
        <Center h="100%">
          {!authLoading && (
            <Text>
              <Link
                onClick={() => {
                  signIn("github").catch(console.error);
                }}
                textDecor="underline"
              >
                Sign in
              </Link>{" "}
              to view or create new experiments!
            </Text>
          )}
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title="Experiments">
      <VStack alignItems={"flex-start"} px={4} py={2}>
        <HStack minH={8} align="center">
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <Flex alignItems="center">
                <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
              </Flex>
            </BreadcrumbItem>
          </Breadcrumb>
        </HStack>
        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={8} p="4">
          <NewExperimentCard />
          {experiments?.data?.map((exp) => <ExperimentCard key={exp.id} exp={exp} />)}
        </SimpleGrid>
      </VStack>
    </AppShell>
  );
}
