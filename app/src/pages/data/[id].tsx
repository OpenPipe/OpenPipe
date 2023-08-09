import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  Center,
  Flex,
  Icon,
  Input,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { RiDatabase2Line } from "react-icons/ri";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import DatasetEntriesTable from "~/components/datasets/DatasetEntriesTable";
import { DatasetHeaderButtons } from "~/components/datasets/DatasetHeaderButtons/DatasetHeaderButtons";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";

export default function Dataset() {
  const router = useRouter();
  const utils = api.useContext();

  const dataset = useDataset();
  const datasetId = router.query.id as string;

  const [name, setName] = useState(dataset.data?.name || "");
  useEffect(() => {
    setName(dataset.data?.name || "");
  }, [dataset.data?.name]);

  const updateMutation = api.datasets.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== dataset.data?.name && dataset.data?.id) {
      await updateMutation.mutateAsync({
        id: dataset.data.id,
        updates: { name: name },
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
    <AppShell title={dataset.data?.name}>
      <VStack h="full">
        <PageHeaderContainer>
          <Breadcrumb>
            <BreadcrumbItem>
              <ProjectBreadcrumbContents projectName={dataset.data?.project?.name} />
            </BreadcrumbItem>
            <BreadcrumbItem>
              <Link href="/data">
                <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                  <Icon as={RiDatabase2Line} boxSize={4} mr={2} /> Datasets
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
          <DatasetHeaderButtons />
        </PageHeaderContainer>
        <Box w="full" overflowX="auto" flex={1} px={8} pt={8} pb={16}>
          {datasetId && <DatasetEntriesTable />}
        </Box>
      </VStack>
    </AppShell>
  );
}
