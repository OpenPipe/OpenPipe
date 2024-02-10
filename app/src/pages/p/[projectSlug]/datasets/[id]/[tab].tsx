import { Breadcrumb, BreadcrumbItem, Center, Flex, Icon, VStack, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { AiOutlineDatabase } from "react-icons/ai";

import AppShell from "~/components/nav/AppShell";
import { useDataset } from "~/utils/hooks";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useAppStore } from "~/state/store";
import FileUploadsCard from "~/components/datasets/FileUploadsCard";
import DatasetContentTabs from "~/components/datasets/DatasetContentTabs/DatasetContentTabs";
import { ProjectLink } from "~/components/ProjectLink";

export default function Dataset() {
  const dataset = useDataset();

  useEffect(() => {
    useAppStore.getState().sharedArgumentsEditor.loadMonaco().catch(console.error);
  }, []);

  if (!dataset.isLoading && !dataset.data) {
    return (
      <AppShell title="Dataset not found">
        <Center h="100%">
          <div>Dataset not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title={dataset.data?.name} containerProps={{ position: "relative" }}>
      <VStack position="sticky" left={0} right={0} w="full">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents projectName={dataset.data?.project?.name} />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <ProjectLink href="/datasets">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={AiOutlineDatabase} boxSize={4} mr={2} /> Datasets
                </Flex>
              </ProjectLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>{dataset.data?.name}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
        </PageHeaderContainer>
      </VStack>
      <DatasetContentTabs />
      <FileUploadsCard />
    </AppShell>
  );
}
