import { VStack, HStack, Text } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import DatasetsTable from "~/components/datasets/DatasetsTable";
import NewDatasetButton from "~/components/datasets/NewDatasetButton";
import ConditionallyEnable from "~/components/ConditionallyEnable";

export default function DatasetsPage() {
  return (
    <AppShell title="Datasets" requireAuth>
      <VStack w="full" py={8} px={8} spacing={4} alignItems="flex-start">
        <HStack w="full" justifyContent="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            Datasets
          </Text>
          <ConditionallyEnable accessRequired="requireCanModifyProject">
            <NewDatasetButton />
          </ConditionallyEnable>
        </HStack>
        <DatasetsTable />
      </VStack>
    </AppShell>
  );
}
