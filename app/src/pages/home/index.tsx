import { Breadcrumb, BreadcrumbItem, Divider, Text, VStack } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useExperiments, useSelectedOrg } from "~/utils/hooks";

export default function HomePage() {
  const { data: selectedOrg } = useSelectedOrg();

  const experiments = useExperiments();

  return (
    <AppShell>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <Text>Homepage</Text>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <VStack px={8} pt={4} alignItems="flex-start" spacing={4}>
        <Text fontSize="2xl" fontWeight="bold">
          {selectedOrg?.name}
        </Text>
        <Divider />
        {/* TODO: Add more dashboard cards (one looks weird) */}
        {/* <HStack w="full">
          <StatsCard title="Recent Experiments" href="/experiments">
            <VStack alignItems="flex-start" w="full">
              {experiments.data?.slice(0, 5).map((exp) => (
                <Link key={exp.id} href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}>
                  <VStack key={exp.id} alignItems="flex-start" spacing={0}>
                    <Text fontWeight="bold">{exp.label}</Text>
                    <Text flex={1}>Last updated {formatTimePast(exp.updatedAt)}</Text>
                  </VStack>
                </Link>
              ))}
            </VStack>
          </StatsCard>
        </HStack> */}
      </VStack>
    </AppShell>
  );
}
