import { Text, VStack, Divider } from "@chakra-ui/react";
import FineTunesTable from "~/components/fineTunes/FineTunesTable";

import AppShell from "~/components/nav/AppShell";

export default function FineTunes() {
  return (
    <AppShell title="Fine Tunes" requireAuth requireBeta>
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          Fine Tunes
        </Text>
        <Divider />
        <FineTunesTable />
      </VStack>
    </AppShell>
  );
}
