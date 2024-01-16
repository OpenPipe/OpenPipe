import { Center, Text, VStack, HStack, Button, Card } from "@chakra-ui/react";
import { useRouter } from "next/router";
import Link from "next/link";

import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

export default function Invitation() {
  const router = useRouter();
  const utils = api.useContext();

  const invitationToken = router.query.invitationToken as string | undefined;

  const invitation = api.users.getProjectInvitation.useQuery(
    { invitationToken: invitationToken as string },
    { enabled: !!invitationToken },
  );

  const cancelMutation = api.users.cancelProjectInvitation.useMutation();
  const [declineInvitation, isDeclining] = useHandledAsyncCallback(async () => {
    if (invitationToken) {
      await cancelMutation.mutateAsync({
        invitationToken,
      });
      await router.replace("/");
    }
  }, [cancelMutation, invitationToken]);

  const acceptMutation = api.users.acceptProjectInvitation.useMutation();
  const [acceptInvitation, isAccepting] = useHandledAsyncCallback(async () => {
    if (invitationToken) {
      const resp = await acceptMutation.mutateAsync({
        invitationToken,
      });
      if (!maybeReportError(resp) && resp) {
        await utils.projects.list.invalidate();
        await router.replace({
          pathname: "/p/[projectSlug]/request-logs",
          query: { projectSlug: resp.payload },
        });
      }
    }
  }, [acceptMutation, invitationToken]);

  if (invitation.isLoading) {
    return (
      <AppShell requireAuth title="Loading...">
        <Center h="full">
          <Text>Loading...</Text>
        </Center>
      </AppShell>
    );
  }

  if (!invitationToken || !invitation.data) {
    return (
      <AppShell requireAuth title="Invalid invitation token">
        <Center h="full">
          <VStack spacing={8}>
            <Text>
              The invitation you've received is invalid or expired. Please ask your project admin
              for a new token.
            </Text>
            <Button as={Link} variant="outline" href="/" colorScheme="blue">
              Go Home
            </Button>
          </VStack>
        </Center>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell requireAuth title="Invitation">
        <Center h="full">
          <Card>
            <VStack
              spacing={8}
              w="full"
              maxW="2xl"
              p={16}
              borderWidth={1}
              borderRadius={8}
              bgColor="white"
            >
              <Text fontSize="lg" fontWeight="bold">
                You're invited! 🎉
              </Text>
              <Text textAlign="center">
                You've been invited to join <b>{invitation.data.project.name}</b> by{" "}
                <b>
                  {invitation.data.sender.name} ({invitation.data.sender.email})
                </b>
                .
              </Text>
              <HStack spacing={4}>
                <Button colorScheme="gray" isLoading={isDeclining} onClick={declineInvitation}>
                  Decline
                </Button>
                <Button colorScheme="orange" isLoading={isAccepting} onClick={acceptInvitation}>
                  Accept
                </Button>
              </HStack>
            </VStack>
          </Card>
        </Center>
      </AppShell>
    </>
  );
}
