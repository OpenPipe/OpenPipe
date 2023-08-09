import { SimpleGrid, Icon, Breadcrumb, BreadcrumbItem, Flex } from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import AppShell from "~/components/nav/AppShell";
import {
  ExperimentCard,
  ExperimentCardSkeleton,
  NewExperimentCard,
} from "~/components/experiments/ExperimentCard";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useExperiments } from "~/utils/hooks";

export default function ExperimentsPage() {
  const experiments = useExperiments();

  return (
    <AppShell title="Experiments" requireAuth>
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
