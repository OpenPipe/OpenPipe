import { VStack, HStack, Text, Divider } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import DatasetsTable from "~/components/datasets/DatasetsTable";
import NewDatasetButton from "~/components/datasets/NewDatasetButton";

export default function DatasetsPage() {
  return (
    <AppShell title="Datasets" requireAuth>
      <VStack w="full" py={8} px={8} spacing={4} alignItems="flex-start">
        <HStack w="full" justifyContent="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            Datasets
          </Text>
          <NewDatasetButton />
        </HStack>
        <Divider />
        <DatasetsTable />
      </VStack>
    </AppShell>
  );
}
