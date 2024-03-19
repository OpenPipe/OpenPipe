import { Breadcrumb, BreadcrumbItem, Center, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import { AiOutlineThunderbolt } from "react-icons/ai";

import AppShell from "~/components/nav/AppShell";
import { useFineTune } from "~/utils/hooks";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import FineTuneContentTabs from "~/components/fineTunes/FineTuneContentTabs/FineTuneContentTabs";
import { ProjectLink } from "~/components/ProjectLink";

export default function FineTune() {
  const fineTune = useFineTune();

  if (!fineTune.isLoading && !fineTune.data) {
    return (
      <AppShell title="Fine-tuned model not found">
        <Center h="100%">
          <div>Fine-tuned model not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  const slug = fineTune.data?.slug ?? "";

  return (
    <AppShell title={`openpipe:${slug}`}>
      <VStack>
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/fine-tunes">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={AiOutlineThunderbolt} boxSize={4} mr={1.5} mt={0.5} /> Fine Tunes
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text size="sm">openpipe:{slug}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
        <VStack w="full" h="full" px={8} alignItems="flex-start" spacing={4}>
          <FineTuneContentTabs />
        </VStack>
      </VStack>
    </AppShell>
  );
}
