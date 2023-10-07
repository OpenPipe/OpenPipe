import { useRouter } from "next/router";
import { type Query } from "nextjs-routes";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";

export const useExperiments = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.experiments.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useExperiment = () => {
  const router = useRouter();
  const experiment = api.experiments.get.useQuery(
    { slug: router.query.experimentSlug as string },
    { enabled: !!router.query.experimentSlug },
  );

  return experiment;
};

export const useExperimentAccess = () => {
  return useExperiment().data?.access ?? { canView: false, canModify: false };
};

type AsyncFunction<T extends unknown[], U> = (...args: T) => Promise<U>;

export function useHandledAsyncCallback<T extends unknown[], U>(
  callback: AsyncFunction<T, U>,
  deps: React.DependencyList,
) {
  const [loading, setLoading] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const wrappedCallback = useCallback((...args: T) => {
    setLoading((loading) => loading + 1);
    setError(null);

    callback(...args)
      .catch((error) => {
        setError(error as Error);
        console.error(error);
      })
      .finally(() => {
        setLoading((loading) => loading - 1);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [wrappedCallback, loading > 0, error] as const;
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

interface Dimensions {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

// get dimensions of an element
export const useElementDimensions = (): [RefObject<HTMLElement>, Dimensions | undefined] => {
  const ref = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions | undefined>();

  useEffect(() => {
    if (ref.current) {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          setDimensions(entry.contentRect);
        });
      });

      const observedRef = ref.current;

      observer.observe(observedRef);

      // Cleanup the observer on component unmount
      return () => {
        if (observedRef) {
          observer.unobserve(observedRef);
        }
      };
    }
  }, []);

  return [ref, dimensions];
};

export const useIsMissingBetaAccess = () => {
  const flags = useAppStore((s) => s.featureFlags.featureFlags);
  const flagsLoaded = useAppStore((s) => s.featureFlags.flagsLoaded);

  // If the flags haven't loaded yet, we can't say for sure that the user doesn't have beta access
  return flagsLoaded && !flags?.betaAccess;
};

export const usePageParams = () => {
  const router = useRouter();

  const page = parseInt(router.query.page as string, 10) || 1;
  const pageSize = parseInt(router.query.pageSize as string, 10) || 10;

  const setPageParams = (newPageParams: { page?: number; pageSize?: number }) => {
    const updatedQuery = {
      ...router.query,
      ...newPageParams,
    };

    if (!newPageParams.page) {
      delete updatedQuery.page;
    }

    if (!newPageParams.pageSize) {
      delete updatedQuery.pageSize;
    }

    void router.push(
      {
        pathname: router.pathname,
        query: updatedQuery as Query,
      },
      undefined,
      { shallow: true },
    );
  };

  return { page, pageSize, setPageParams };
};

export const useScenarios = () => {
  const experiment = useExperiment();
  const { page, pageSize } = usePageParams();

  return api.scenarios.list.useQuery(
    { experimentId: experiment.data?.id ?? "", page, pageSize },
    { enabled: experiment.data?.id != null },
  );
};

export const useScenario = (scenarioId: string) => {
  return api.scenarios.get.useQuery({ id: scenarioId });
};

export const useVisibleScenarioIds = () => useScenarios().data?.scenarios.map((s) => s.id) ?? [];

export const useSelectedProject = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.projects.get.useQuery(
    { id: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useScenarioVars = () => {
  const experiment = useExperiment();

  return api.scenarioVars.list.useQuery(
    { experimentId: experiment.data?.id ?? "" },
    { enabled: experiment.data?.id != null },
  );
};

export const useDatasets = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.datasets.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useDataset = () => {
  const router = useRouter();
  const dataset = api.datasets.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id },
  );

  return dataset;
};

export const useDatasetEntries = () => {
  const dataset = useDataset().data;
  const { page, pageSize } = usePageParams();

  const { data, isLoading, ...rest } = api.datasetEntries.list.useQuery(
    { datasetId: dataset?.id ?? "", page, pageSize },
    { enabled: !!dataset?.id },
  );

  const [stableData, setStableData] = useState(data);

  useEffect(() => {
    // Prevent annoying flashes while logs are loading from the server
    if (!isLoading) {
      setStableData(data);
    }
  }, [data, isLoading]);

  return { data: stableData, isLoading, ...rest };
};

export const useDatasetEntry = (entryId: string | null) => {
  return api.datasetEntries.get.useQuery({ id: entryId as string }, { enabled: !!entryId });
};

export const useTrainingEntries = () => {
  const fineTune = useFineTune().data;
  const { page, pageSize } = usePageParams();

  const { data, isLoading, ...rest } = api.datasetEntries.listTrainingEntries.useQuery(
    { fineTuneId: fineTune?.id ?? "", page, pageSize },
    { enabled: !!fineTune?.id },
  );

  const [stableData, setStableData] = useState(data);

  useEffect(() => {
    // Prevent annoying flashes while logs are loading from the server
    if (!isLoading) {
      setStableData(data);
    }
  }, [data, isLoading]);

  return { data: stableData, isLoading, ...rest };
};

export const useTestingEntries = (refetchInterval?: number) => {
  const fineTune = useFineTune().data;
  const { page, pageSize } = usePageParams();

  const { data, isLoading, ...rest } = api.datasetEntries.listTestingEntries.useQuery(
    { fineTuneId: fineTune?.id ?? "", page, pageSize },
    { enabled: !!fineTune?.id, refetchInterval },
  );

  const [stableData, setStableData] = useState(data);

  useEffect(() => {
    // Prevent annoying flashes while logs are loading from the server
    if (!isLoading) {
      setStableData(data);
    }
  }, [data, isLoading]);

  return { data: stableData, isLoading, ...rest };
};

export const useLoggedCalls = (applyFilters = true) => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const { page, pageSize } = usePageParams();
  const filters = useAppStore((state) => state.logFilters.filters);

  const { data, isLoading, ...rest } = api.loggedCalls.list.useQuery(
    { projectId: selectedProjectId ?? "", page, pageSize, filters: applyFilters ? filters : [] },
    { enabled: !!selectedProjectId },
  );

  const [stableData, setStableData] = useState(data);

  useEffect(() => {
    // Prevent annoying flashes while logs are loading from the server
    if (!isLoading) {
      setStableData(data);
    }
  }, [data, isLoading]);

  return { data: stableData, isLoading, ...rest };
};

export const useTagNames = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.loggedCalls.getTagNames.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useFineTunes = (refetchInterval?: number) => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);

  return api.fineTunes.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId, refetchInterval },
  );
};

export const useFineTune = () => {
  const router = useRouter();
  const fineTune = api.fineTunes.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id },
  );

  return fineTune;
};

export const usePruningRules = () => {
  const selectedDataset = useDataset().data;

  return api.pruningRules.list.useQuery(
    { datasetId: selectedDataset?.id ?? "" },
    { enabled: !!selectedDataset?.id },
  );
};

export const useIsClientRehydrated = () => {
  const isRehydrated = useAppStore((state) => state.isRehydrated);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isRehydrated && isMounted;
};
