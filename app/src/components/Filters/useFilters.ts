import { useRouter } from "next/router";

export const comparators = ["=", "!=", "CONTAINS", "NOT_CONTAINS"] as const;

export interface FilterData {
  id: string;
  field: string;
  comparator: (typeof comparators)[number];
  value: string;
}

const FIELD_SEPARATOR = ":";
const FILTER_SEPARATOR = ",";

const parseFilters = (encodedFilters: string) =>
  encodedFilters
    .split(FILTER_SEPARATOR)
    .map((e) => {
      const [id, field, comparator, value] = e.split(FIELD_SEPARATOR);

      if (!id || !field || !comparator) return null;
      return {
        id: decodeURIComponent(id),
        field: decodeURIComponent(field),
        comparator: decodeURIComponent(comparator),
        value: decodeURIComponent(value || ""),
      };
    })
    .filter(Boolean) as FilterData[];

const encodeFilters = (filters: FilterData[]) =>
  filters
    .map((filter) => {
      return (
        encodeURIComponent(filter.id) +
        FIELD_SEPARATOR +
        encodeURIComponent(filter.field) +
        FIELD_SEPARATOR +
        encodeURIComponent(filter.comparator) +
        FIELD_SEPARATOR +
        encodeURIComponent(filter.value)
      );
    })
    .join(FILTER_SEPARATOR);

const FILTERS_KEY = "filters";

export const useFilters = () => {
  const router = useRouter();

  // Split the "filters" query by commas to get the array of strings.
  const filters =
    typeof router.query[FILTERS_KEY] === "string" ? parseFilters(router.query[FILTERS_KEY]) : [];

  const updateQuery = (newFilters: FilterData[]) => {
    // Form the updated query.
    const updatedQuery = {
      ...router.query,
      [FILTERS_KEY]: encodeFilters(newFilters),
    };

    // If newFilters is empty, we want to remove the "filters" query param entirely.
    if (newFilters.length === 0) {
      delete (updatedQuery as { [key: string]: unknown })[FILTERS_KEY];
    }

    void router.push(
      {
        pathname: router.pathname,
        query: updatedQuery,
      },
      undefined,
      { shallow: true },
    );
  };

  const addFilter = (filter: FilterData) => {
    updateQuery([...filters, filter]);
  };

  const updateFilter = (filter: FilterData) => {
    const index = filters.findIndex((f) => f.id === filter.id);
    filters[index] = filter;
    updateQuery(filters);
  };

  const deleteFilter = (id: string) => {
    const index = filters.findIndex((f) => f.id === id);
    filters.splice(index, 1);
    updateQuery(filters);
  };

  const clearFilters = () => {
    updateQuery([]);
  };

  return { filters, addFilter, updateFilter, deleteFilter, clearFilters };
};
