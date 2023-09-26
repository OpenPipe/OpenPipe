import { useDisclosure } from "@chakra-ui/react";
import { Breadcrumb, BreadcrumbItem, Center, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { AiOutlineThunderbolt } from "react-icons/ai";

import AppShell from "~/components/nav/AppShell";
import { useFineTune } from "~/utils/hooks";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { FineTuneHeaderButtons } from "~/components/fineTunes/FineTuneHeaderButtons";
import FineTuneConfigurationDrawer from "~/components/fineTunes/FineTuneConfigurationDrawer/FineTuneConfigurationDrawer";

export default function FineTune() {
  const fineTune = useFineTune();

  const drawerDisclosure = useDisclosure();

  if (!fineTune.isLoading && !fineTune.data) {
    return (
      <AppShell title="Fine-tuned model not found">
        <Center h="100%">
          <div>Fine-tuned model not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  if (!fineTune.data) return null;

  const { slug } = fineTune.data;

  return (
    <>
      <AppShell title={slug}>
        <VStack h="full" overflowY="scroll">
          <PageHeaderContainer>
            <Breadcrumb>
              <BreadcrumbItem>
                <ProjectBreadcrumbContents />
              </BreadcrumbItem>
              <BreadcrumbItem>
                <Link href="/fine-tunes">
                  <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                    <Icon as={AiOutlineThunderbolt} boxSize={4} mr={2} /> Fine Tunes
                  </Flex>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <Text size="sm">openpipe:{slug}</Text>
              </BreadcrumbItem>
            </Breadcrumb>
            <FineTuneHeaderButtons openDrawer={drawerDisclosure.onOpen} />
          </PageHeaderContainer>
          <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full"></VStack>
        </VStack>
      </AppShell>
      <FineTuneConfigurationDrawer disclosure={drawerDisclosure} />
    </>
  );
}
