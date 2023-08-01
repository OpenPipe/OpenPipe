import {
  Box,
  type BoxProps,
  Button,
  DarkMode,
  GlobalStyle,
  HStack,
  Heading,
  Icon,
  Link,
  Table,
  Tbody,
  Td,
  Text,
  type TextProps,
  Th,
  Tr,
  VStack,
  useInterval,
} from "@chakra-ui/react";
import { signIn, useSession } from "next-auth/react";
import Head from "next/head";
import { useCallback, useState } from "react";
import { BsGithub } from "react-icons/bs";
import { TopNavbar } from "~/components/nav/AppShell";
import UserMenu from "~/components/nav/UserMenu";
import { api } from "~/utils/api";
import dayjs from "~/utils/dayjs";
import { useHandledAsyncCallback } from "~/utils/hooks";

// Shows how long until the competition starts. Refreshes every second
function CountdownTimer(props: { date: Date } & TextProps) {
  const [now, setNow] = useState(dayjs(0));

  useInterval(() => {
    setNow(dayjs());
  }, 1000);

  const { date, ...rest } = props;

  const kickoff = dayjs(props.date);
  const diff = kickoff.diff(now, "second");
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = Math.floor(diff % 60);

  return (
    <Text {...rest}>
      <Text as="span" fontWeight="bold">
        Kickoff in
      </Text>{" "}
      {days}d {hours}h {minutes}m {seconds}s
    </Text>
  );
}

function ApplicationStatus(props: BoxProps) {
  const user = useSession().data;
  const entrant = api.worldChamps.userStatus.useQuery().data;
  const applyMutation = api.worldChamps.apply.useMutation();

  const utils = api.useContext();

  const [onSignIn] = useHandledAsyncCallback(async () => {
    await signIn("github");
  }, []);

  const [onApply] = useHandledAsyncCallback(async () => {
    await applyMutation.mutateAsync();
    await utils.worldChamps.userStatus.invalidate();
  }, []);

  const Wrapper = useCallback(
    (wrapperProps: BoxProps) => (
      <Box {...props} {...wrapperProps} minH="120px" alignItems="center" justifyItems="center" />
    ),
    [props],
  );

  if (user === null) {
    return (
      <Wrapper>
        <Button onClick={onSignIn} colorScheme="orange" leftIcon={<Icon as={BsGithub} />}>
          Connect GitHub to apply
        </Button>
      </Wrapper>
    );
  } else if (user) {
    return (
      <Wrapper>
        <HStack spacing={8}>
          <UserMenu user={user} borderRadius={2} borderColor={"gray.700"} borderWidth={1} pr={6} />
          <Box flex={1}>
            {entrant?.approved ? (
              <Text fontSize="sm">
                You're accepted! We'll send you more details before August 14th.
              </Text>
            ) : entrant ? (
              <Text fontSize="sm">
                Application submitted successfully! We'll notify you by email before August 14th.
              </Text>
            ) : (
              <Button onClick={onApply} colorScheme="orange">
                Apply to compete
              </Button>
            )}
          </Box>
        </HStack>
      </Wrapper>
    );
  }

  return <Wrapper />;
}

export default function Signup() {
  return (
    <DarkMode>
      <GlobalStyle />

      <Head>
        <title>🏆 Prompt Engineering World Championships</title>
        <meta property="og:title" content="🏆 Prompt Engineering World Championships" key="title" />
        <meta
          property="og:description"
          content="Think you have what it takes to be the best? Compete with the world's top prompt engineers and see where you rank!"
          key="description"
        />
      </Head>

      <Box bgColor="gray.900" color="gray.200" minH="100vh" w="full">
        <TopNavbar />
        <VStack mx="auto" py={24} maxW="2xl" align="start" fontSize="lg">
          <Heading size="lg">🏆 Prompt Engineering World Championships</Heading>
          <CountdownTimer
            date={new Date("2023-08-14T00:00:00Z")}
            fontSize="2xl"
            alignSelf="center"
            color="gray.500"
          />

          <ApplicationStatus py={8} alignSelf="center" />

          <Text fontSize="lg">
            Think you have what it takes to be the best? Compete with the world's top prompt
            engineers and see where you rank!
          </Text>

          <Heading size="lg" pt={12} alignSelf="left">
            Event Details
          </Heading>
          <Table variant="simple">
            <Tbody>
              <Tr>
                <Th>Kickoff</Th>
                <Td>August 14</Td>
              </Tr>
              <Tr>
                <Th>Prize</Th>
                <Td>$15,000 grand prize + smaller category prizes.</Td>
              </Tr>
              <Tr>
                <Th>Events</Th>
                <Td>
                  Optimize prompts for multiple tasks selected from academic benchmarks and
                  real-world applications.
                </Td>
              </Tr>
              <Tr>
                <Th>Models</Th>
                <Td>Separate "weight classes" for GPT 3.5, Claude Instant, and Llama 2.</Td>
              </Tr>
              <Tr>
                <Th>Qualifications</Th>
                <Td>Open to entrants with any level of experience.</Td>
              </Tr>
              <Tr>
                <Th>Certificates</Th>
                <Td>Certificate of mastery for all qualifying participants.</Td>
              </Tr>
              <Tr>
                <Th>Cost</Th>
                <Td>
                  <strong>Free</strong>. We'll cover your inference budget.
                </Td>
              </Tr>
              <Tr>
                <Th>Questions?</Th>
                <Td>
                  <Link href="mailto:world-champs@openpipe.ai" textDecor="underline">
                    Email us
                  </Link>{" "}
                  with any follow-up questions!
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </VStack>
      </Box>
    </DarkMode>
  );
}
