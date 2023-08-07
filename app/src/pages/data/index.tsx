import {
  SimpleGrid,
  Icon,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  Center,
  Text,
  Link,
  HStack,
} from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { signIn, useSession } from "next-auth/react";
import { RiDatabase2Line } from "react-icons/ri";
import {
  DatasetCard,
  DatasetCardSkeleton,
  NewDatasetCard,
} from "~/components/datasets/DatasetCard";

export default function DatasetsPage() {
  const datasets = api.datasets.list.useQuery();

  const user = useSession().data;
  const authLoading = useSession().status === "loading";

  if (user === null || authLoading) {
    return (
      <AppShell title="Data">
        <Center h="100%">
          {!authLoading && (
            <Text>
              <Link
                onClick={() => {
                  signIn("github").catch(console.error);
                }}
                textDecor="underline"
              >
                Sign in
              </Link>{" "}
              to view or create new datasets!
            </Text>
          )}
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title="Data">
      <VStack alignItems={"flex-start"} px={8} py={2}>
        <HStack minH={8} align="center" pt={2}>
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <Flex alignItems="center">
                <Icon as={RiDatabase2Line} boxSize={4} mr={2} /> Datasets
              </Flex>
            </BreadcrumbItem>
          </Breadcrumb>
        </HStack>
        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={8} py="4">
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
      </VStack>
    </AppShell>
  );
}
