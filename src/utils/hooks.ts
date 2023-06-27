import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { api } from "~/utils/api";

export const useExperiment = () => {
  const router = useRouter();
  const experiment = api.experiments.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id }
  );

  return experiment;
};

export function useHandledAsyncCallback<T extends (...args: unknown[]) => Promise<unknown>>(
  callback: T,
  deps: React.DependencyList
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrappedCallback = useCallback((...args: Parameters<T>) => {
    setLoading(true);
    setError(null);

    callback(...args)
      .catch((error) => {
        setError(error as Error);
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
    /* eslint-disable react-hooks/exhaustive-deps */
  }, deps);

  return [wrappedCallback, loading, error] as const;
}

// Have to do this ugly thing to convince Next not to try to access `navigator`
// on the server side at build time, when it isn't defined.
export const useModifierKeyLabel = () => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(navigator?.platform?.startsWith("Mac") ? "⌘" : "Ctrl");
  }, []);
  return label;
};
