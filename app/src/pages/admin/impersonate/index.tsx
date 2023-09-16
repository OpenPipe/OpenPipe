import { Button, Card, HStack, Input } from "@chakra-ui/react";
import { useState } from "react";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

export default function Impersonate() {
  const [email, setEmail] = useState("");

  const impersonateMutation = api.adminUsers.impersonate.useMutation();

  const [impersonate] = useHandledAsyncCallback(async () => {
    await impersonateMutation.mutateAsync({ email });

    // hard refresh the page
    window.location.reload();
  }, [email, impersonateMutation]);

  return (
    <AppShell title="Admin Impersonate">
      <Card m={4} p={4}>
        <HStack>
          <Input
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button colorScheme="blue" onClick={impersonate}>
            Impersonate
          </Button>
        </HStack>
      </Card>
    </AppShell>
  );
}
