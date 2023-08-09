import { SimpleGrid, Icon, Breadcrumb, BreadcrumbItem, Flex } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import { RiDatabase2Line } from "react-icons/ri";
import {
  DatasetCard,
  DatasetCardSkeleton,
  NewDatasetCard,
} from "~/components/datasets/DatasetCard";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import ProjectBreadcrumbContents from "~/components/nav/ProjectBreadcrumbContents";
import { useDatasets } from "~/utils/hooks";

export default function DatasetsPage() {
  const datasets = useDatasets();

  return (
    <AppShell title="Data" requireAuth>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem>
            <ProjectBreadcrumbContents />
          </BreadcrumbItem>
          <BreadcrumbItem minH={8}>
            <Flex alignItems="center">
              <Icon as={RiDatabase2Line} boxSize={4} mr={2} /> Datasets
            </Flex>
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
      <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={8} py={4} px={8}>
        <NewDatasetCard />
        {datasets.data && !datasets.isLoading ? (
          datasets?.data?.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={{ ...dataset, numEntries: dataset._count.datasetEntries }}
            />
          ))
        ) : (
          <>
            <DatasetCardSkeleton />
            <DatasetCardSkeleton />
            <DatasetCardSkeleton />
          </>
        )}
      </SimpleGrid>
    </AppShell>
  );
}
