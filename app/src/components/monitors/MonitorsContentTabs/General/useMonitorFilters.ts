import { useQueryParam, JsonParam, withDefault, BooleanParam } from "use-query-params";

import { type FilterData } from "~/components/Filters/types";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import { addFilterIds, useFilters, filtersAreEqual } from "~/components/Filters/useFilters";
import { useMonitor } from "../../useMonitor";
import { useCallback } from "react";
import { useFineTunes } from "~/utils/hooks";
import { formatFTSlug } from "~/utils/utils";

export const INITIAL_FILTERS_URL_KEY = "initial";

const stripInitialFilters = (filters: FilterData[]): FilterData[] => {
  return filters.filter(
    (filter) =>
      filter.field !== LoggedCallsFiltersDefaultFields.Model &&
      filter.field !== LoggedCallsFiltersDefaultFields.StatusCode,
  );
};

export const useMonitorFilters = () => {
  const { filters: initialFilters, setFilters: setInitialFilters } = useFilters({
    urlKey: INITIAL_FILTERS_URL_KEY,
  });
  const [{ sampleRate, maxOutputSize }, setSamplingCriteria] = useQueryParam<{
    sampleRate: number;
    maxOutputSize: number;
  }>("sampling", withDefault(JsonParam, { sampleRate: 0, maxOutputSize: 0 }));

  const [skipFilter, setSkipFilter] = useQueryParam<boolean>(
    "skipFilter",
    withDefault(BooleanParam, false),
  );
  const [judgementCriteria, setJudgementCriteria] = useQueryParam<{
    model: string;
    instructions: string;
  }>("judgement", withDefault(JsonParam, { model: "", instructions: "" }));

  const modelFilter = initialFilters.find(
    (filter) => filter.field === LoggedCallsFiltersDefaultFields.Model,
  );
  const strippedInitialFilters = stripInitialFilters(initialFilters);

  const fineTunes = useFineTunes().data?.fineTunes;
  const monitor = useMonitor().data;
  const savedInitialFilters = monitor?.config.initialFilters;
  const savedSampleRate = monitor?.config.sampleRate;
  const savedMaxOutputSize = monitor?.config.maxOutputSize;
  const savedSkipFilter = monitor?.filter.config.skipped;
  const savedJudgementCriteria = monitor?.filter.config.judgementCriteria;

  const initializeFilters = useCallback(() => {
    if (
      !savedInitialFilters ||
      !savedSampleRate ||
      !savedMaxOutputSize ||
      savedSkipFilter === undefined ||
      !savedJudgementCriteria ||
      !fineTunes?.[0]
    )
      return;

    if (savedInitialFilters.length) {
      setInitialFilters(addFilterIds(savedInitialFilters));
    } else {
      setInitialFilters(
        addFilterIds([
          {
            field: LoggedCallsFiltersDefaultFields.Model,
            comparator: "=",
            value: formatFTSlug(fineTunes[0].slug),
          },
          {
            field: LoggedCallsFiltersDefaultFields.StatusCode,
            comparator: "=",
            value: "200",
          },
        ]),
      );
    }

    setSamplingCriteria({ sampleRate: savedSampleRate, maxOutputSize: savedMaxOutputSize });
    setSkipFilter(savedSkipFilter);
    setJudgementCriteria(savedJudgementCriteria);
  }, [
    fineTunes,
    savedInitialFilters,
    setInitialFilters,
    savedSampleRate,
    savedMaxOutputSize,
    setSamplingCriteria,
    savedSkipFilter,
    setSkipFilter,
    savedJudgementCriteria,
    setJudgementCriteria,
  ]);

  const filtersInitialized = !!initialFilters.length && sampleRate !== 0;

  const noChanges =
    (!savedInitialFilters || filtersAreEqual(initialFilters, savedInitialFilters)) &&
    savedSampleRate === sampleRate &&
    savedMaxOutputSize === maxOutputSize &&
    savedJudgementCriteria?.model === judgementCriteria.model &&
    savedSkipFilter === skipFilter &&
    savedJudgementCriteria?.instructions === judgementCriteria.instructions;

  return {
    filtersInitialized,
    noChanges,
    initializeFilters,
    savedInitialFilters,
    initialFilters,
    modelFilter,
    strippedInitialFilters,
    setInitialFilters,
    savedSampleRate,
    savedMaxOutputSize,
    sampleRate,
    maxOutputSize,
    setSamplingCriteria,
    skipFilter,
    setSkipFilter,
    judgementCriteria: judgementCriteria,
    setJudgementCriteria,
  };
};
