import {
  Breadcrumb,
  BreadcrumbItem,
  Center,
  Flex,
  Icon,
  Input,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import Link from "next/link";

import { useState, useEffect } from "react";
import { AiOutlineDatabase } from "react-icons/ai";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import DatasetConfigurationDrawer from "~/components/datasets/DatasetConfigurationDrawer/DatasetConfigurationDrawer";
import { DatasetHeaderButtons } from "~/components/datasets/DatasetHeaderButtons";
import DatasetEntriesTable from "~/components/datasets/DatasetEntriesTable/DatasetEntriesTable";
import DatasetEntryPaginator from "~/components/datasets/DatasetEntryPaginator";
import { useAppStore } from "~/state/store";

export default function Dataset() {
  const utils = api.useContext();

  const dataset = useDataset();

  const drawerDisclosure = useDisclosure();
  const [name, setName] = useState(dataset.data?.name || "");
  useEffect(() => {
    setName(dataset.data?.name || "");
  }, [dataset.data?.name]);

  useEffect(() => {
    useAppStore.getState().sharedArgumentsEditor.loadMonaco().catch(console.error);
  }, []);

  const updateMutation = api.datasets.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== dataset.data?.name && dataset.data?.id) {
      await updateMutation.mutateAsync({
        id: dataset.data.id,
        name,
      });
      await Promise.all([utils.datasets.list.invalidate(), utils.datasets.get.invalidate()]);
    }
  }, [updateMutation, dataset.data?.id, dataset.data?.name, name]);

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
    <>
      <AppShell title={dataset.data?.name}>
        <VStack h="full" overflowY="scroll">
          <PageHeaderContainer>
            <Breadcrumb>
              <BreadcrumbItem>
                <ProjectBreadcrumbContents projectName={dataset.data?.project?.name} />
              </BreadcrumbItem>
              <BreadcrumbItem>
                <Link href="/datasets">
                  <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                    <Icon as={AiOutlineDatabase} boxSize={4} mr={2} /> Datasets
                  </Flex>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <Input
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={onSaveName}
                  borderWidth={1}
                  borderColor="transparent"
                  fontSize={16}
                  px={0}
                  minW={{ base: 100, lg: 300 }}
                  flex={1}
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{ borderColor: "blue.500", outline: "none" }}
                />
              </BreadcrumbItem>
            </Breadcrumb>
            <DatasetHeaderButtons openDrawer={drawerDisclosure.onOpen} />
          </PageHeaderContainer>
          <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
            <DatasetEntriesTable />
            <DatasetEntryPaginator />
          </VStack>
        </VStack>
      </AppShell>
      <DatasetConfigurationDrawer disclosure={drawerDisclosure} />
    </>
  );
}
