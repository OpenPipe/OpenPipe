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
import { toUTC } from "./dayjs";
import { useDateFilter } from "~/components/Filters/useDateFilter";
import { type FilterData } from "~/components/Filters/types";
import { useActiveFeatureFlags } from "posthog-js/react";

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

export const useIsMissingBetaAccess = () => !useActiveFeatureFlags()?.includes("betaAccess");

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

export const useSearchQuery = () => {
  const router = useRouter();

  const searchQuery = (router.query.search as string) || "";

  const setSearchQueryParam = (newSearchQuery: { search?: string }) => {
    const updatedQuery = {
      ...router.query,
      ...newSearchQuery,
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

  return { searchQuery, setSearchQueryParam };
};

export const useProjectList = api.projects.list.useQuery;

export const useSelectedProject = () => {
  const router = useRouter();

  const projectSlug = router.query.projectSlug as string;

  return api.projects.get.useQuery({ projectSlug: projectSlug ?? "" }, { enabled: !!projectSlug });
};

export const useDatasets = () => {
  const selectedProjectId = useSelectedProject().data?.id;
  return api.datasets.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId },
  );
};

export const useDataset = (options?: { datasetId?: string; refetchInterval?: number }) => {
  const router = useRouter();

  const datasetId = options?.datasetId ?? (router.query.id as string);

  const dataset = api.datasets.get.useQuery(
    { id: datasetId },
    { enabled: !!datasetId, refetchInterval: options?.refetchInterval },
  );

  return dataset;
};

export const useNode = ({ id }: { id?: string }) =>
  api.nodes.get.useQuery({ id: id as string }, { enabled: !!id });

export const useNodeEntries = ({
  nodeId,
  refetchInterval = 0,
}: {
  nodeId?: string;
  refetchInterval?: number;
}) => {
  const filters = useFilters().filters;

  const { page, pageSize } = usePageParams();

  const sort =
    useSortOrder<NonNullable<RouterInputs["nodeEntries"]["list"]["sortOrder"]>["field"]>().params;

  const result = api.nodeEntries.list.useQuery(
    { nodeId: nodeId ?? "", filters, page, pageSize, sortOrder: sort },
    { enabled: !!nodeId, refetchInterval },
  );

  return useStableData(result);
};

export const useNodeEntry = ({
  persistentId,
  nodeId,
}: {
  persistentId: string | null;
  nodeId?: string;
}) => {
  const result = api.nodeEntries.get.useQuery(
    { persistentId: persistentId as string, nodeId: nodeId as string },
    { enabled: !!persistentId && !!nodeId },
  );

  return useStableData(result);
};

export const useDatasetArchives = () => {
  const dataset = useDataset().data;

  return api.archives.listForDataset.useQuery(
    { datasetId: dataset?.id ?? "" },
    { enabled: !!dataset?.id },
  );
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

export const useTrainingEntries = () => {
  const fineTune = useFineTune().data;
  const { page, pageSize } = usePageParams();

  const result = api.fineTunes.listTrainingEntries.useQuery(
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

  const result = api.nodeEntries.listTestingEntries.useQuery(
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

export const useStats = (
  selectedProjectId: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) => {
  const startDateUTC = startDate
    ? toUTC(new Date(startDate)).startOf("day").toDate()
    : toUTC(new Date()).startOf("month").toDate();

  const endDateUTC = endDate
    ? toUTC(new Date(endDate)).endOf("day").toDate()
    : toUTC(new Date()).endOf("month").toDate();

  return api.usage.stats.useQuery(
    {
      projectId: selectedProjectId,
      startDate: startDateUTC,
      endDate: endDateUTC,
    },
    { enabled: !!selectedProjectId },
  );
};

export const useModelTestingStats = (
  datasetId?: string,
  modelId?: string,
  refetchInterval?: number,
) => {
  const filters = useMappedModelIdFilters();
  const visibleModelIds = useVisibleModelIds().visibleModelIds;

  const result = api.datasetEvals.testingStats.useQuery(
    { datasetId: datasetId ?? "", filters, modelId: modelId ?? "", visibleModelIds },
    { enabled: !!datasetId && !!modelId, refetchInterval },
  );

  return useStableData(result);
};

// prevent blank filters from throwing off caching
const removeEmptyFilters = (filters: FilterData[]) => {
  return filters.filter((filter) => filter.value !== "");
};

export const useLoggedCalls = (options?: { filters?: FilterData[]; disabled?: boolean }) => {
  const selectedProjectId = useSelectedProject().data?.id;
  const { page, pageSize } = usePageParams();

  const generalFilters = useFilters().filters;
  const dateFilters = useDateFilter().filters;

  const filtersWithValues = removeEmptyFilters(
    options?.filters ?? [...dateFilters, ...generalFilters],
  );

  const result = api.loggedCalls.list.useQuery(
    {
      projectId: selectedProjectId ?? "",
      page,
      pageSize,
      filters: filtersWithValues,
    },
    { enabled: !!selectedProjectId && !options?.disabled, refetchOnWindowFocus: false },
  );

  return result;
};

export const useLoggedCallsCount = (options?: { filters?: FilterData[]; disabled?: boolean }) => {
  const selectedProjectId = useSelectedProject().data?.id;

  const generalFilters = useFilters().filters;
  const dateFilters = useDateFilter().filters;

  const filtersWithValues = removeEmptyFilters(
    options?.filters ?? [...dateFilters, ...generalFilters],
  );

  const setMatchingLogsCount = useAppStore((state) => state.selectedLogs.setMatchingLogsCount);

  const result = api.loggedCalls.getMatchingCount.useQuery(
    {
      projectId: selectedProjectId ?? "",
      filters: filtersWithValues,
    },
    {
      enabled: !!selectedProjectId && !options?.disabled,
      refetchOnWindowFocus: false,
      trpc: {
        context: {
          slowBatch: true,
        },
      },
    },
  );

  useEffect(() => {
    if (!result.isFetching) setMatchingLogsCount(result.data?.count ?? 0);
  }, [result, setMatchingLogsCount]);

  return result;
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

export const useDatasetFineTunes = () => {
  const dataset = useDataset().data;

  return api.fineTunes.listForDataset.useQuery(
    { datasetId: dataset?.id ?? "" },
    { enabled: !!dataset?.id },
  );
};

export const useFineTunes = (refetchInterval?: number) => {
  const selectedProjectId = useSelectedProject().data?.id;

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
  const selectedProjectId = useSelectedProject().data?.id;

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

export const useInvoices = (refetchInterval?: number) => {
  const selectedProjectId = useSelectedProject().data?.id;

  return api.invoices.list.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId, refetchInterval },
  );
};

export const useInvoice = (id: string, refetchInterval?: number) => {
  const selectedProjectId = useSelectedProject().data?.id;

  return api.invoices.get.useQuery(
    { invoiceId: id },
    { enabled: !!selectedProjectId, refetchInterval, retry: false },
  );
};

export const usePaymentMethods = (refetchInterval?: number) => {
  const selectedProjectId = useSelectedProject().data?.id;

  return api.payments.getPaymentMethods.useQuery(
    { projectId: selectedProjectId ?? "" },
    { enabled: !!selectedProjectId, refetchInterval },
  );
};

export const useIsClientInitialized = () =>
  useAppStore((state) => state.isRehydrated && state.isMounted);

export const useAdminProjects = (refetchInterval = 0) => {
  const { page, pageSize } = usePageParams();
  const { searchQuery } = useSearchQuery();
  const sortOrder =
    useSortOrder<NonNullable<RouterInputs["adminProjects"]["list"]["sortOrder"]>["field"]>().params;

  const result = api.adminProjects.list.useQuery(
    { page, pageSize, sortOrder, searchQuery },
    { refetchInterval },
  );

  return useStableData(result);
};
