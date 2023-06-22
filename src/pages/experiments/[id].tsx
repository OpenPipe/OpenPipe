import { Center } from "@mantine/core";
import { useRouter } from "next/router";
import OutputsTable from "~/components/OutputsTable";
import AppNav from "~/components/nav/AppNav";
import { api } from "~/utils/api";

export default function Experiment() {
  const router = useRouter();

  const experiment = api.experiments.get.useQuery({ id: router.query.id as string });

  if (!experiment.data) {
    return (
      <AppNav title="Experiment not found">
        <Center>
          <div>Experiment not found 😕</div>
        </Center>
      </AppNav>
    );
  }

  return (
    <AppNav title={experiment.data.label}>
      <OutputsTable experimentId={router.query.id as string} />
    </AppNav>
  );
}
