import {
  SimpleGrid,
  Icon,
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
import {
  ExperimentCard,
  ExperimentCardSkeleton,
  NewExperimentCard,
} from "~/components/experiments/ExperimentCard";
import { signIn, useSession } from "next-auth/react";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";

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
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem minH={8}>
            <Flex alignItems="center">
              <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
            </Flex>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={8} py="4" px={8}>
        <NewExperimentCard />
        {experiments.data && !experiments.isLoading ? (
          experiments?.data?.map((exp) => <ExperimentCard key={exp.id} exp={exp} />)
        ) : (
          <>
            <ExperimentCardSkeleton />
            <ExperimentCardSkeleton />
            <ExperimentCardSkeleton />
          </>
        )}
      </SimpleGrid>
    </AppShell>
  );
}
