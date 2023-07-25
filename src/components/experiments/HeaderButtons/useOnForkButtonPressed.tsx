import { useCallback, useEffect } from "react";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import queryString from "query-string";

export const useOnForkButtonPressed = () => {
  const router = useRouter();

  const user = useSession().data;
  const experiment = useExperiment();

  const forkMutation = api.experiments.fork.useMutation();

  const [onFork, isForking] = useHandledAsyncCallback(async () => {
    if (!experiment.data?.id) return;
    const forkedExperimentId = await forkMutation.mutateAsync({ id: experiment.data.id });
    await router.push({ pathname: "/experiments/[id]", query: { id: forkedExperimentId } });
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
    if (router.query.fork === "true" && user && experiment.data?.id) {
      void forkFromQuery();
    }
  }, [router.query, user, onFork, router, experiment.data?.id]);

  return { onForkButtonPressed, isForking };
};
