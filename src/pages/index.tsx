import { Center } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";

export default function Home() {
  return (
    <AppShell title="Experiment not found">
      <Center h="100vh">
        <div>Select an experiment from the sidebar to get started!</div>
      </Center>
    </AppShell>
  );
}
