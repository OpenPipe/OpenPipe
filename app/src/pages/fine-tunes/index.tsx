import { Text, VStack } from "@chakra-ui/react";
import BetaBanner from "~/components/BetaBanner";
import FineTunesTable from "~/components/fineTunes/FineTunesTable";

import AppShell from "~/components/nav/AppShell";

export default function FineTunes() {
  return (
    <AppShell title="Fine Tunes" requireAuth>
      <BetaBanner />
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          Fine Tunes
        </Text>
        <FineTunesTable />
      </VStack>
    </AppShell>
  );
}
