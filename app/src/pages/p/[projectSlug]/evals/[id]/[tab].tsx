import { Breadcrumb, BreadcrumbItem, Center, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";

import AppShell from "~/components/nav/AppShell";
import { useDatasetEval } from "~/utils/hooks";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import EvalContentTabs from "~/components/evals/EvalContentTabs/EvalContentTabs";
import { ProjectLink } from "~/components/ProjectLink";

export default function Eval() {
  const datasetEval = useDatasetEval();

  if (!datasetEval.isLoading && !datasetEval.data) {
    return (
      <AppShell title="Eval not found">
        <Center h="100%">
          <div>Eval not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  if (!datasetEval.data) return null;

  const { name } = datasetEval.data;

  return (
    <AppShell title={name}>
      <VStack h="full" overflowY="scroll">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/evals">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={FaBalanceScale} boxSize={4} mr={1.5} mt={0.5} /> Evals
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text size="sm">{name}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack w="full" h="full" px={8} alignItems="flex-start" spacing={4}>
          <EvalContentTabs />
        </VStack>
      </VStack>
    </AppShell>
  );
}
