import { v4 as uuidv4 } from "uuid";

import { type ServerFilterData, type FilterData } from "~/components/Filters/types";
import { LoggedCallsFiltersDefaultFields } from "~/types/shared.types";
import { INITIAL_FILTERS_URL_KEY } from "../constants";
import { addFilterIds, useFilters } from "~/components/Filters/useFilters";
import { defaultMonitorSQLFilterOptions } from "./InitialFilterContents";
import { truthyFilter } from "~/utils/utils";

export const stripFilters = (filters: FilterData[]): FilterData[] => {
  return filters.filter(
    (filter) =>
      defaultMonitorSQLFilterOptions.find((option) => option.field === filter.field) !== undefined,
  );
};

export const useInitialFilters = () => {
  const { filters, setFilters } = useFilters({ urlKey: INITIAL_FILTERS_URL_KEY });

  const modelFilter = filters.find(
    (filter) => filter.field === LoggedCallsFiltersDefaultFields.Model,
  );
  const statusCodeFilter = filters.find(
    (filter) => filter.field === LoggedCallsFiltersDefaultFields.StatusCode,
  );
  const sampleRateFilter = filters.find(
    (filter) => filter.field === LoggedCallsFiltersDefaultFields.SampleRate,
  );
  const maxOutputSizeFilter = filters.find(
    (filter) => filter.field === LoggedCallsFiltersDefaultFields.MaxOutputSize,
  );
  const strippedFilters = stripFilters(filters);

  const saveableFilters = [modelFilter, statusCodeFilter, ...strippedFilters].filter(truthyFilter);

  const updateFilters = ({
    startingFilters,
    model,
    statusCode,
    sampleRate,
    maxOutputSize,
  }: {
    startingFilters?: ServerFilterData[];
    model?: string;
    statusCode?: string;
    sampleRate?: number;
    maxOutputSize?: number;
  }) => {
    let updatedFilters = startingFilters ? addFilterIds(startingFilters) : filters;

    if (model !== undefined) {
      updatedFilters = updatedFilters.filter(
        (filter) => filter.field !== LoggedCallsFiltersDefaultFields.Model,
      );
      updatedFilters.push({
        id: uuidv4(),
        field: LoggedCallsFiltersDefaultFields.Model,
        comparator: "=",
        value: model,
      });
    }
    if (statusCode !== undefined) {
      updatedFilters = updatedFilters.filter(
        (filter) => filter.field !== LoggedCallsFiltersDefaultFields.StatusCode,
      );
      updatedFilters.push({
        id: uuidv4(),
        field: LoggedCallsFiltersDefaultFields.StatusCode,
        comparator: "=",
        value: statusCode,
      });
    }
    if (sampleRate !== undefined) {
      updatedFilters = updatedFilters.filter(
        (filter) => filter.field !== LoggedCallsFiltersDefaultFields.SampleRate,
      );
      updatedFilters.push({
        id: uuidv4(),
        field: LoggedCallsFiltersDefaultFields.SampleRate,
        comparator: "=",
        value: sampleRate.toString(),
      });
    }
    if (maxOutputSize !== undefined) {
      updatedFilters = updatedFilters.filter(
        (filter) => filter.field !== LoggedCallsFiltersDefaultFields.MaxOutputSize,
      );
      updatedFilters.push({
        id: uuidv4(),
        field: LoggedCallsFiltersDefaultFields.MaxOutputSize,
        comparator: "=",
        value: maxOutputSize.toString(),
      });
    }

    setFilters(updatedFilters);
  };

  return {
    filters,
    modelFilter,
    sampleRateFilter,
    maxOutputSizeFilter,
    strippedFilters,
    saveableFilters,
    updateFilters,
    setFilters,
  };
};
