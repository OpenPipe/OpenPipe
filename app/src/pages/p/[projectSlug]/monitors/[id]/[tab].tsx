import { Breadcrumb, BreadcrumbItem, Center, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import { BsClipboard2Data } from "react-icons/bs";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { ProjectLink } from "~/components/ProjectLink";
import { useMonitor } from "~/components/monitors/useMonitor";
import MonitorContentTabs from "~/components/monitors/MonitorsContentTabs/MonitorsContentTabs";

export default function Monitor() {
  const monitor = useMonitor();

  if (!monitor.isLoading && !monitor.data) {
    return (
      <AppShell title="Eval not found">
        <Center h="100%">
          <div>Monitor not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  if (!monitor.data) return null;

  const { name } = monitor.data;

  return (
    <AppShell title={name}>
      <VStack h="full" overflowY="scroll">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/monitors">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={BsClipboard2Data} boxSize={4} mr={1.5} mt={0.5} /> Monitors
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text size="sm">{name}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack w="full" h="full" px={8} alignItems="flex-start" spacing={4}>
          <MonitorContentTabs />
        </VStack>
      </VStack>
    </AppShell>
  );
}
