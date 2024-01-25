import { Breadcrumb, BreadcrumbItem, Flex, Icon, VStack } from "@chakra-ui/react";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { ProjectLink } from "~/components/ProjectLink";
import BillingContentTabs from "~/components/billing/BillingContentTabs/BillingContentTabs";

import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useSelectedProject } from "~/utils/hooks";

export default function BillingTabs() {
  const selectedProject = useSelectedProject().data;

  return (
    <AppShell title="Billing" requireAuth>
      <VStack position="sticky" left={0} right={0} w="full">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents projectName={selectedProject?.name} />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/billing">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={LiaFileInvoiceDollarSolid} boxSize={4} mr={2} /> Billing
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
      </VStack>
      <BillingContentTabs />
    </AppShell>
  );
}
