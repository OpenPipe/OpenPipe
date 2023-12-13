import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { type Query } from "nextjs-routes";
import type { UseQueryResult } from "@tanstack/react-query";

import { useFilters } from "~/components/Filters/useFilters";
import { useMappedModelIdFilters } from "~/components/datasets/DatasetContentTabs/Evaluation/useMappedModelIdFilters";
import { useTestEntrySortOrder } from "~/components/datasets/DatasetContentTabs/Evaluation/useTestEntrySortOrder";
import { useVisibleModelIds } from "~/components/datasets/DatasetContentTabs/Evaluation/useVisibleModelIds";
import { useSortOrder } from "~/components/sorting";
import { useAppStore } from "~/state/store";
import { type RouterInputs, api } from "~/utils/api";

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

export const useSelectedProject = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.projects.get.useQuery(
    { id: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useDatasets = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.datasets.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useDataset = (datasetId?: string) => {
  const router = useRouter();

  if (!datasetId) {
    datasetId = router.query.id as string;
  }
  const dataset = api.datasets.get.useQuery({ id: datasetId }, { enabled: !!datasetId });

  return dataset;
};

export const useDatasetEntries = (refetchInterval = 0) => {
  const dataset = useDataset().data;

  const filters = useFilters().filters;

  const { page, pageSize } = usePageParams();

  const sort =
    useSortOrder<NonNullable<RouterInputs["datasetEntries"]["list"]["sortOrder"]>["field"]>()
      .params;

  const result = api.datasetEntries.list.useQuery(
    { datasetId: dataset?.id ?? "", filters, page, pageSize, sortOrder: sort },
    { enabled: !!dataset?.id, refetchInterval },
  );

  return useStableData(result);
};

// Prevent annoying flashes while loading from the server
const useStableData = <TData, TError>(result: UseQueryResult<TData, TError>) => {
  const { data, isFetching } = result;
  const [stableData, setStableData] = useState(result.data);

  useEffect(() => {
    if (!isFetching) {
      setStableData(data);
    }
  }, [data, isFetching]);

  return { ...result, data: stableData };
};

export const useDatasetEntry = (entryId: string | null) => {
  const result = api.datasetEntries.get.useQuery({ id: entryId as string }, { enabled: !!entryId });
  return useStableData(result);
};

export const useTrainingEntries = () => {
  const fineTune = useFineTune().data;
  const { page, pageSize } = usePageParams();

  const result = api.datasetEntries.listTrainingEntries.useQuery(
    { fineTuneId: fineTune?.id ?? "", page, pageSize },
    { enabled: !!fineTune?.id },
  );

  return useStableData(result);
};

export const useTestingEntries = (refetchInterval?: number) => {
  const dataset = useDataset().data;

  const filters = useMappedModelIdFilters();

  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const { page, pageSize } = usePageParams();

  const { testEntrySortOrder } = useTestEntrySortOrder();

  const result = api.datasetEntries.listTestingEntries.useQuery(
    {
      datasetId: dataset?.id || "",
      filters,
      visibleModelIds,
      page,
      pageSize,
      sortOrder: testEntrySortOrder ?? undefined,
    },
    { enabled: !!dataset?.id, refetchInterval },
  );

  return useStableData(result);
};

export const useModelTestingStats = (
  datasetId?: string,
  modelId?: string,
  refetchInterval?: number,
) => {
  const filters = useMappedModelIdFilters();
  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const result = api.datasetEntries.testingStats.useQuery(
    { datasetId: datasetId ?? "", filters, modelId: modelId ?? "", visibleModelIds },
    { enabled: !!datasetId && !!modelId, refetchInterval },
  );

  return useStableData(result);
};

export const useLoggedCalls = (applyFilters = true) => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const { page, pageSize } = usePageParams();
  const filters = useFilters().filters;
  const setMatchingLogsCount = useAppStore((state) => state.selectedLogs.setMatchingLogsCount);

  const result = api.loggedCalls.list.useQuery(
    { projectId: selectedProjectId ?? "", page, pageSize, filters: applyFilters ? filters : [] },
    { enabled: !!selectedProjectId, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!result.isFetching) setMatchingLogsCount(result.data?.count ?? 0);
  }, [result, setMatchingLogsCount]);

  return useStableData(result);
};

export const useTotalNumLogsSelected = () => {
  const matchingCount = useAppStore((state) => state.selectedLogs.matchingLogsCount);
  const defaultToSelected = useAppStore((state) => state.selectedLogs.defaultToSelected);
  const selectedLogIds = useAppStore((state) => state.selectedLogs.selectedLogIds);
  const deselectedLogIds = useAppStore((state) => state.selectedLogs.deselectedLogIds);

  if (!matchingCount) return 0;
  if (defaultToSelected) {
    return matchingCount - deselectedLogIds.size;
  }
  return selectedLogIds.size;
};

export const useTagNames = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  return api.loggedCalls.getTagNames.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useDatasetFineTunes = () => {
  const dataset = useDataset().data;

  return api.fineTunes.listForDataset.useQuery(
    { datasetId: dataset?.id ?? "" },
    { enabled: !!dataset?.id },
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

export const useDatasetEval = (refetchInterval?: number) => {
  const router = useRouter();
  return api.datasetEvals.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id, refetchInterval },
  );
};

export const useDatasetEvals = () => {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);

  return api.datasetEvals.list.useQuery(
    { projectId: selectedProjectId as string },
    { enabled: !!selectedProjectId },
  );
};

export const usePruningRules = () => {
  const selectedDataset = useDataset().data;

  return api.pruningRules.list.useQuery(
    { datasetId: selectedDataset?.id ?? "" },
    { enabled: !!selectedDataset?.id },
  );
};

export const useIsClientInitialized = () =>
  useAppStore((state) => state.isRehydrated && state.isMounted);
