import { Breadcrumb, BreadcrumbItem, Divider, Text, VStack } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useSelectedOrg } from "~/utils/hooks";

export default function HomePage() {
  const { data: selectedOrg } = useSelectedOrg();

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
      </VStack>
    </AppShell>
  );
}
