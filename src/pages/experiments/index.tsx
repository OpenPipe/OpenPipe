import {
  SimpleGrid,
  HStack,
  Icon,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  Center,
  Text,
  Link,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { ExperimentCard, NewExperimentCard } from "~/components/experiments/ExperimentCard";
import { signIn, useSession } from "next-auth/react";

export default function ExperimentsPage() {
  const experiments = api.experiments.list.useQuery();

  const user = useSession().data;

  if (user === null) {
    return (
      <AppShell title="Experiments">
        <Center h="100%">
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
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title="Experiments">
      <VStack alignItems={"flex-start"} m={4} mt={1}>
        <HStack w="full" mb={4}>
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
