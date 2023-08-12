import { Text, VStack, Breadcrumb, BreadcrumbItem } from "@chakra-ui/react";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useSelectedProject } from "~/utils/hooks";
import { api } from "~/utils/api";
import LoggedCallTable from "~/components/requestLogs/LoggedCallsTable";
import LoggedCallsPaginator from "~/components/requestLogs/LoggedCallsPaginator";

export default function LoggedCalls() {
  const { data: selectedProject } = useSelectedProject();

  const stats = api.dashboard.stats.useQuery(
    { projectId: selectedProject?.id ?? "" },
    { enabled: !!selectedProject },
  );

  return (
    <AppShell title="Request Logs" requireAuth>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <Text>Request Logs</Text>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <VStack px={8} py={4} alignItems="flex-start" spacing={4}>
        <LoggedCallTable />
        <LoggedCallsPaginator />
      </VStack>
    </AppShell>
  );
}
