import { VStack, Text, Divider } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import DatasetsTable from "~/components/datasets/DatasetsTable";

export default function DatasetsPage() {
  return (
    <AppShell title="Datasets" requireAuth>
      <VStack w="full" py={8} px={8} spacing={4} alignItems="flex-start">
        <Text fontSize="2xl" fontWeight="bold">
          Datasets
        </Text>
        <Divider />
        <DatasetsTable />
      </VStack>
    </AppShell>
  );
}
