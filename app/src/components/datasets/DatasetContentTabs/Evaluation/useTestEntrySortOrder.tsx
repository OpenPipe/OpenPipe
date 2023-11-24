import { JsonParam, useQueryParam, withDefault } from "use-query-params";

import { type SortOrder } from "~/types/shared.types";

export const useTestEntrySortOrder = () => {
  const [testEntrySortOrder, setTestEntrySortOrder] = useQueryParam<{
    modelId: string;
    evalId: string;
    order: SortOrder.ASC | SortOrder.DESC;
  } | null>("sortOrder", withDefault(JsonParam, null));

  return { testEntrySortOrder, setTestEntrySortOrder };
};
