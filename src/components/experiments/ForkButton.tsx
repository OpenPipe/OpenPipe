import { Button, Icon, Spinner, Text } from "@chakra-ui/react";

import { useCallback, useEffect } from "react";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { TbGitFork } from "react-icons/tb";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import queryString from "query-string";

export const ForkButton = () => {
  const utils = api.useContext();
  const router = useRouter();

  const user = useSession().data;
  const experiment = useExperiment();

  const forkMutation = api.experiments.fork.useMutation();

  const [onFork, isForking] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    const forkedExperiment = await forkMutation.mutateAsync({ id: experiment.data.id });
    await utils.experiments.list.invalidate();
    await router.push({ pathname: "/experiments/[id]", query: { id: forkedExperiment.id } });
  }, [forkMutation, experiment.data?.id, router]);

  const onForkButtonPressed = useCallback(() => {
    if (user === null) {
      // Parse the current query parameters
      const currentQueries = queryString.parse(window.location.search);

      // Set the fork parameter to true
      const newQueries = queryString.stringify({
        ...currentQueries,
        fork: "true",
      });

      signIn("github", {
        callbackUrl: `${window.location.origin}${window.location.pathname}?${newQueries}`,
      }).catch(console.error);
    } else {
      onFork();
    }
  }, [onFork, user]);

  useEffect(() => {
    const forkFromQuery = async () => {
      // Remove the 'fork' parameter to avoid forking again
      const updatedQueries = { ...router.query, fork: undefined };
      await router.replace(
        {
          pathname: router.pathname,
          query: updatedQueries,
        },
        undefined,
        { scroll: false, shallow: true },
      );

      onFork();
    };
    if (router.query.fork === "true" && user) {
      void forkFromQuery();
    }
  }, [router.query, user, onFork, router]);

  return (
    <Button onClick={onForkButtonPressed}>
      {isForking ? <Spinner boxSize={5} /> : <Icon as={TbGitFork} boxSize={5} color="gray.600" />}
      <Text ml={2}>Fork Experiment</Text>
    </Button>
  );
};
