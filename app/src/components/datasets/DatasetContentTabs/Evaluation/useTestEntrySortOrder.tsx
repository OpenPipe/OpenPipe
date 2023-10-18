import { useRouter } from "next/router";

import { type SortOrder } from "~/types/shared.types";

const SORT_MODEL_KEY = "sortModel";
const SORT_ORDER_KEY = "sortOrder";

export const useTestEntrySortOrder = () => {
  const router = useRouter();

  // Extract the sort model and sort order from the URL query.
  const sortModelSlug =
    typeof router.query[SORT_MODEL_KEY] === "string" ? router.query[SORT_MODEL_KEY] : null;
  const sortOrder =
    typeof router.query[SORT_ORDER_KEY] === "string" ? router.query[SORT_ORDER_KEY] : null;

  const setSortCriteria = (newSortModelSlug: string | null, newSortOrder: SortOrder | null) => {
    // Form the updated query.
    const updatedQuery = { ...router.query };

    if (newSortModelSlug) {
      updatedQuery[SORT_MODEL_KEY] = newSortModelSlug;
    } else {
      delete updatedQuery[SORT_MODEL_KEY];
    }

    if (newSortOrder) {
      updatedQuery[SORT_ORDER_KEY] = newSortOrder;
    } else {
      delete updatedQuery[SORT_ORDER_KEY];
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

  return { sortModelSlug, sortOrder, setSortCriteria };
};
