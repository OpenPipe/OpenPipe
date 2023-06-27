import { Box, Center } from "@chakra-ui/react";
import { useRouter } from "next/router";
import OutputsTable from "~/components/OutputsTable";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";

export default function Experiment() {
  const router = useRouter();

  const experiment = api.experiments.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id }
  );

  if (!experiment.isLoading && !experiment.data) {
    return (
      <AppShell title="Experiment not found">
        <Center h="100vh">
          <div>Experiment not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  return (
    <AppShell title={experiment.data?.label}>
      <Box minH="100vh" mb={50}>
        <OutputsTable experimentId={router.query.id as string | undefined} />
      </Box>
    </AppShell>
  );
}
