import { useCallback } from "react";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

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
      signIn("github").catch(console.error);
    } else {
      onFork();
    }
  }, [onFork, user]);

  return { onForkButtonPressed, isForking };
};
